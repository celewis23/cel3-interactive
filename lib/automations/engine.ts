/**
 * AutomationEngine — Core execution service
 *
 * Processes automation node graphs in response to trigger events.
 * All execution is non-blocking — errors are caught and logged, never thrown.
 * Supports dry-run mode (no side effects).
 */

import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";
import {
  type AutomationNode,
  type AutomationTriggerType,
  type TriggerContext,
  type ExecutionContext,
  type ConditionRule,
  type ActionNodeConfig,
  type DelayConfig,
  type ConditionConfig,
  type ActionType,
  type AutomationNodeGraph,
  generateNodeId,
  summariseNode,
} from "./types";

// ── Variable interpolation map ────────────────────────────────────────────────

const VAR_REGEX = /\{\{([^}]+)\}\}/g;

function interpolate(template: string, ctx: ExecutionContext): string {
  return template.replace(VAR_REGEX, (_, key: string) => {
    const parts = key.trim().split(".");
    const section = parts[0] as keyof ExecutionContext["data"];
    const field = parts[1];
    const data = ctx.data[section] as Record<string, unknown> | undefined;
    if (data && field) return String(data[field] ?? "");
    return `{{${key}}}`;
  });
}

// ── Main engine class ─────────────────────────────────────────────────────────

export class AutomationEngine {
  /**
   * Fire an automation trigger.
   * Finds all enabled automations matching this trigger type and evaluates them.
   * Fire-and-forget — never throws.
   */
  fire(
    orgId: string,
    triggerType: AutomationTriggerType,
    triggerConfig: Record<string, unknown>,
    entityType: string,
    entityId: string,
    clientId?: string
  ): void {
    this._fire(orgId, triggerType, triggerConfig, entityType, entityId, clientId).catch((err) => {
      console.error(`[AutomationEngine] fire() error for trigger ${triggerType}:`, err?.message ?? err);
    });
  }

  private async _fire(
    orgId: string,
    triggerType: AutomationTriggerType,
    triggerConfig: Record<string, unknown>,
    entityType: string,
    entityId: string,
    clientId?: string
  ): Promise<void> {
    const automations = await sanityServer.fetch<Array<{
      _id: string;
      name: string;
      nodes: AutomationNodeGraph;
      triggerType: AutomationTriggerType;
      triggerConfig: Record<string, unknown>;
    }>>(
      `*[_type == "automation" && enabled == true && triggerType == $triggerType] {
        _id, name, nodes, triggerType, triggerConfig
      }`,
      { triggerType }
    );

    for (const automation of automations) {
      const ctx: TriggerContext = { orgId, triggerType, triggerConfig, entityType, entityId, clientId };
      await this._evaluate(automation, ctx).catch((err) => {
        console.error(`[AutomationEngine] evaluate error for ${automation._id}:`, err?.message ?? err);
      });
    }
  }

  /**
   * Evaluate a single automation against a trigger context.
   * Creates a run record and begins node processing.
   */
  private async _evaluate(
    automation: { _id: string; name: string; nodes: AutomationNodeGraph },
    triggerCtx: TriggerContext,
    isDryRun = false
  ): Promise<string> {
    // Create run record
    const run = await sanityWriteClient.create({
      _type: "automationRun",
      automationId: automation._id,
      automationName: automation.name,
      triggeredByEntityType: triggerCtx.entityType,
      triggeredByEntityId: triggerCtx.entityId,
      triggeredByClientId: triggerCtx.clientId ?? null,
      triggerType: triggerCtx.triggerType,
      triggerConfig: triggerCtx.triggerConfig ?? {},
      status: "running",
      branchPath: {},
      isDryRun,
      startedAt: new Date().toISOString(),
    });

    const execCtx: ExecutionContext = {
      ...triggerCtx,
      runId: run._id,
      isDryRun,
      data: {},
    };

    // Pre-fetch entity data
    await this._hydrateContext(execCtx);

    // Find trigger node and start
    const nodes = automation.nodes.nodes;
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      await this._failRun(run._id, "No trigger node found");
      return run._id;
    }

    try {
      await this._processNode(triggerNode.next ? nodes.find((n) => n.id === triggerNode.next) ?? null : null, nodes, execCtx);

      // Complete run
      await sanityWriteClient.patch(run._id).set({
        status: "completed",
        completedAt: new Date().toISOString(),
      }).commit();

      // Increment run count
      await sanityWriteClient
        .patch(automation._id)
        .inc({ runCount: 1 })
        .set({ lastRunAt: new Date().toISOString() })
        .commit();
    } catch (err) {
      await this._failRun(run._id, err instanceof Error ? err.message : String(err));
    }

    return run._id;
  }

  /**
   * Public entry point for dry-run mode (test runs).
   * Returns the runId for fetching results.
   */
  async dryRun(
    automation: { _id: string; name: string; nodes: AutomationNodeGraph },
    triggerCtx: TriggerContext
  ): Promise<string> {
    return this._evaluate(automation, triggerCtx, true);
  }

  /**
   * Resume execution from a previously-pending delay step.
   */
  async resumeFromPendingStep(
    runId: string,
    nodeId: string,
    automationId: string,
    isDryRun: boolean
  ): Promise<void> {
    const [automation, run] = await Promise.all([
      sanityServer.fetch<{ _id: string; name: string; nodes: AutomationNodeGraph } | null>(
        `*[_type == "automation" && _id == $id][0]{ _id, name, nodes }`,
        { id: automationId }
      ),
      sanityServer.fetch<{
        triggeredByEntityType: string;
        triggeredByEntityId: string;
        triggeredByClientId?: string;
        triggerType: AutomationTriggerType;
        triggerConfig?: Record<string, unknown>;
        branchPath?: Record<string, "yes" | "no">;
      } | null>(
        `*[_type == "automationRun" && _id == $id][0]{
          triggeredByEntityType, triggeredByEntityId, triggeredByClientId,
          triggerType, triggerConfig, branchPath
        }`,
        { id: runId }
      ),
    ]);

    if (!automation || !run) return;

    const nodes = automation.nodes.nodes;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const execCtx: ExecutionContext = {
      orgId: "default",
      runId,
      isDryRun,
      triggerType: run.triggerType,
      triggerConfig: run.triggerConfig ?? {},
      entityType: run.triggeredByEntityType,
      entityId: run.triggeredByEntityId,
      clientId: run.triggeredByClientId,
      data: {},
    };

    await this._hydrateContext(execCtx);

    // Continue from the node AFTER the delay (next pointer)
    const nextNode = node.next ? nodes.find((n) => n.id === node.next) ?? null : null;
    await this._processNode(nextNode, nodes, execCtx);
  }

  /**
   * Resume an automation run step after approval.
   */
  async resumeApprovedStep(runId: string, nodeId: string, automationId: string): Promise<void> {
    await this.resumeFromPendingStep(runId, nodeId, automationId, false);
  }

  // ── Node processor ──────────────────────────────────────────────────────────

  private async _processNode(
    node: AutomationNode | null,
    allNodes: AutomationNode[],
    ctx: ExecutionContext
  ): Promise<void> {
    if (!node) return;

    const stepId = await this._createStep(ctx.runId, node);

    try {
      await sanityWriteClient.patch(stepId).set({ status: "running" }).commit();

      switch (node.type) {
        case "trigger":
          // Trigger node is processed automatically — just move to next
          await this._completeStep(stepId, {});
          await this._processNode(
            node.next ? allNodes.find((n) => n.id === node.next) ?? null : null,
            allNodes, ctx
          );
          break;

        case "delay":
          await this._processDelay(node, allNodes, ctx, stepId);
          break;

        case "condition":
          await this._processCondition(node, allNodes, ctx, stepId);
          break;

        case "action":
          await this._processAction(node, allNodes, ctx, stepId);
          break;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await sanityWriteClient.patch(stepId).set({ status: "failed", error: errMsg }).commit();
      throw err;
    }
  }

  // ── Delay ───────────────────────────────────────────────────────────────────

  private async _processDelay(
    node: Extract<AutomationNode, { type: "delay" }>,
    allNodes: AutomationNode[],
    ctx: ExecutionContext,
    stepId: string
  ): Promise<void> {
    const cfg = node.config as DelayConfig;

    let executeAt: Date;
    if (cfg.mode === "fixed" && cfg.fixed_date) {
      executeAt = new Date(cfg.fixed_date);
    } else {
      const now = new Date();
      const multipliers: Record<string, number> = {
        minutes: 60 * 1000,
        hours: 3600 * 1000,
        days: 86400 * 1000,
        weeks: 604800 * 1000,
      };
      executeAt = new Date(now.getTime() + cfg.amount * (multipliers[cfg.unit] ?? 86400000));
    }

    if (ctx.isDryRun) {
      // In dry-run, just record what would happen
      await this._completeStep(stepId, {
        dryRun: true,
        message: `Would wait until ${executeAt.toISOString()}`,
      });
      // Continue immediately in dry-run
      await this._processNode(
        node.next ? allNodes.find((n) => n.id === node.next) ?? null : null,
        allNodes, ctx
      );
      return;
    }

    // Schedule for later — update step with executeAt and mark pending
    await sanityWriteClient.patch(stepId).set({
      status: "pending",
      executeAt: executeAt.toISOString(),
    }).commit();

    // Do NOT continue — the process-pending job will resume later
  }

  // ── Condition ───────────────────────────────────────────────────────────────

  private async _processCondition(
    node: Extract<AutomationNode, { type: "condition" }>,
    allNodes: AutomationNode[],
    ctx: ExecutionContext,
    stepId: string
  ): Promise<void> {
    const cfg = node.config as ConditionConfig;

    let branch: "yes" | "no";
    try {
      branch = await this._evaluateCondition(cfg, ctx);
    } catch (err) {
      if (cfg.on_error === "skip") {
        branch = "no";
      } else {
        throw err;
      }
    }

    // Record branch taken
    const branchPath: Record<string, "yes" | "no"> = {};
    branchPath[node.id] = branch;
    await sanityWriteClient.patch(ctx.runId)
      .setIfMissing({ branchPath: {} })
      .set({ [`branchPath.${node.id}`]: branch })
      .commit();

    await this._completeStep(stepId, { branch });

    const nextNodeId = node.branches[branch];
    const nextNode = nextNodeId ? allNodes.find((n) => n.id === nextNodeId) ?? null : null;
    await this._processNode(nextNode, allNodes, ctx);
  }

  private async _evaluateCondition(cfg: ConditionConfig, ctx: ExecutionContext): Promise<"yes" | "no"> {
    const results = await Promise.all(cfg.conditions.map((rule) => this._checkRule(rule, ctx)));

    const passed = cfg.logic === "all" ? results.every(Boolean) : results.some(Boolean);
    return passed ? "yes" : "no";
  }

  private async _checkRule(rule: ConditionRule, ctx: ExecutionContext): Promise<boolean> {
    const value = await this._resolveField(rule.field, ctx);

    switch (rule.operator) {
      case "equals":        return String(value) === String(rule.value);
      case "not_equals":    return String(value) !== String(rule.value);
      case "greater_than":  return Number(value) > Number(rule.value);
      case "less_than":     return Number(value) < Number(rule.value);
      case "contains":      return String(value).toLowerCase().includes(String(rule.value).toLowerCase());
      case "not_contains":  return !String(value).toLowerCase().includes(String(rule.value).toLowerCase());
      case "is_empty":      return !value || String(value).trim() === "";
      case "is_not_empty":  return !!value && String(value).trim() !== "";
      default:              return false;
    }
  }

  private async _resolveField(field: string, ctx: ExecutionContext): Promise<unknown> {
    await this._hydrateContext(ctx);

    const [section, ...rest] = field.split(".");
    const key = rest.join(".");

    if (section === "time_since_trigger_days") {
      // Days since automation was triggered
      return 0; // resolved at runtime
    }

    const data = ctx.data[section as keyof ExecutionContext["data"]];
    if (data && key) return (data as Record<string, unknown>)[key];
    return null;
  }

  // ── Action ──────────────────────────────────────────────────────────────────

  private async _processAction(
    node: Extract<AutomationNode, { type: "action" }>,
    allNodes: AutomationNode[],
    ctx: ExecutionContext,
    stepId: string
  ): Promise<void> {
    const cfg = node.config as ActionNodeConfig;

    // Check if approval required
    if (cfg.require_approval && !ctx.isDryRun) {
      await sanityWriteClient.patch(stepId).set({ status: "awaiting_approval" }).commit();
      await sanityWriteClient.create({
        _type: "automationApproval",
        runId: ctx.runId,
        nodeId: node.id,
        automationId: (await sanityServer.fetch<{ automationId: string } | null>(
          `*[_type == "automationRun" && _id == $id][0]{ automationId }`,
          { id: ctx.runId }
        ))?.automationId ?? "",
        actionDescription: `${cfg.action_type.replace(/_/g, " ")}`,
        clientName: (ctx.data.client as Record<string, unknown> | undefined)?.name as string ?? "",
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        requestedAt: new Date().toISOString(),
        status: "pending",
      });
      return; // Pause — resume after approval
    }

    try {
      const output = await this._executeAction(cfg, ctx);
      await this._completeStep(stepId, output ?? {});
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (cfg.on_error === "skip") {
        await sanityWriteClient.patch(stepId).set({ status: "skipped", error: errMsg }).commit();
      } else {
        throw err;
      }
    }

    // Continue to next node
    await this._processNode(
      node.next ? allNodes.find((n) => n.id === node.next) ?? null : null,
      allNodes, ctx
    );
  }

  private async _executeAction(cfg: ActionNodeConfig, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    if (ctx.isDryRun) {
      return { dryRun: true, action: cfg.action_type, message: `Would execute: ${cfg.action_type}` };
    }

    const ac = cfg.action_config as Record<string, unknown>;

    switch (cfg.action_type as ActionType) {
      case "send_email":
        return this._actionSendEmail(ac, ctx);
      case "create_task":
        return this._actionCreateTask(ac, ctx);
      case "add_client_tag":
        return this._actionAddClientTag(ac, ctx);
      case "remove_client_tag":
        return this._actionRemoveClientTag(ac, ctx);
      case "move_lead_stage":
        return this._actionMoveLeadStage(ac, ctx);
      case "change_project_status":
        return this._actionChangeProjectStatus(ac, ctx);
      case "send_internal_notification":
        return this._actionSendInternalNotification(ac, ctx);
      case "webhook_post":
        return this._actionWebhookPost(ac, ctx);
      case "activate_portal":
        return this._actionActivatePortal(ac, ctx);
      case "archive_project":
        return this._actionArchiveProject(ctx);
      case "pause_workflow":
        // Pause — throw special signal
        throw new Error("PAUSE_WORKFLOW");
      case "send_form":
        return { message: "Form send requires integration — logged for manual review" };
      case "send_sms":
        return { message: "SMS requires Twilio integration — logged for manual review" };
      default:
        return { message: `Action type '${cfg.action_type}' logged — integration pending` };
    }
  }

  // ── Action implementations ──────────────────────────────────────────────────

  private async _actionSendEmail(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const subject = interpolate(String(ac.subject ?? ""), ctx);
    const bodyHtml = interpolate(String(ac.body_html ?? ""), ctx);

    let toEmail = "";
    if (ac.to === "client") {
      await this._hydrateContext(ctx);
      toEmail = (ctx.data.client as Record<string, unknown> | undefined)?.email as string ?? "";
    } else if (ac.to === "custom") {
      toEmail = String(ac.recipient_email ?? "");
    }

    if (!toEmail) return { error: "No recipient email resolved" };

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@cel3interactive.com",
      to: toEmail,
      subject,
      html: bodyHtml,
    });

    return { sent: true, to: toEmail, subject };
  }

  private async _actionCreateTask(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const title = interpolate(String(ac.title ?? "New task"), ctx);
    const dueDate = ac.due_days_from_now
      ? new Date(Date.now() + Number(ac.due_days_from_now) * 86400000).toISOString().split("T")[0]
      : null;

    const task = await sanityWriteClient.create({
      _type: "pmTask",
      title,
      description: interpolate(String(ac.description ?? ""), ctx),
      priority: ac.priority ?? "medium",
      assignee: ac.assigned_to_user_id ?? null,
      dueDate,
      createdAt: new Date().toISOString(),
    });

    return { taskId: task._id, title };
  }

  private async _actionAddClientTag(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    if (!ctx.clientId) return { skipped: true, reason: "No client in context" };
    const tag = String(ac.tag ?? "");
    await sanityWriteClient.patch(ctx.clientId)
      .setIfMissing({ tags: [] })
      .append("tags", [tag])
      .commit();
    return { tag, clientId: ctx.clientId };
  }

  private async _actionRemoveClientTag(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    if (!ctx.clientId) return { skipped: true, reason: "No client in context" };
    const client = await sanityServer.fetch<{ tags?: string[] } | null>(
      `*[_id == $id][0]{ tags }`, { id: ctx.clientId }
    );
    if (!client) return { skipped: true };
    const newTags = (client.tags ?? []).filter((t) => t !== ac.tag);
    await sanityWriteClient.patch(ctx.clientId).set({ tags: newTags }).commit();
    return { removed: ac.tag, clientId: ctx.clientId };
  }

  private async _actionMoveLeadStage(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    if (ctx.entityType !== "lead") return { skipped: true };
    await sanityWriteClient.patch(ctx.entityId).set({ stage: ac.stage }).commit();
    return { stage: ac.stage, leadId: ctx.entityId };
  }

  private async _actionChangeProjectStatus(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const projectId = ctx.entityType === "pmProject" ? ctx.entityId
      : (ctx.data.project as Record<string, unknown> | undefined)?._id as string;
    if (!projectId) return { skipped: true };
    await sanityWriteClient.patch(projectId).set({ status: ac.status }).commit();
    return { status: ac.status, projectId };
  }

  private async _actionSendInternalNotification(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const message = interpolate(String(ac.message ?? ""), ctx);
    const announcement = await sanityWriteClient.create({
      _type: "announcement",
      title: "Automation notification",
      body: message,
      authorName: "Automation Engine",
      isInternal: true,
      _createdAt: new Date().toISOString(),
    });
    sendPushNotificationToAudience(
      {
        title: "Automation notification",
        body: message,
        href: "/admin/announcements",
        tag: `announcement:${announcement._id}`,
      },
      { module: "announcements", action: "view" }
    ).catch(console.error);
    return { notified: true, message };
  }

  private async _actionWebhookPost(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const url = String(ac.url ?? "");
    const body = interpolate(String(ac.body_template ?? "{}"), ctx);
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (ac.headers_json) headers = { ...headers, ...JSON.parse(String(ac.headers_json)) };
    } catch { /* ignore invalid headers */ }

    const res = await fetch(url, {
      method: String(ac.method ?? "POST"),
      headers,
      body,
    });
    return { status: res.status, ok: res.ok };
  }

  private async _actionActivatePortal(ac: Record<string, unknown>, ctx: ExecutionContext): Promise<Record<string, unknown>> {
    if (!ctx.clientId) return { skipped: true };
    await sanityWriteClient.patch(ctx.clientId).set({ portalEnabled: ac.activate ?? true }).commit();
    return { portalEnabled: ac.activate, clientId: ctx.clientId };
  }

  private async _actionArchiveProject(ctx: ExecutionContext): Promise<Record<string, unknown>> {
    const projectId = ctx.entityType === "pmProject" ? ctx.entityId
      : (ctx.data.project as Record<string, unknown> | undefined)?._id as string;
    if (!projectId) return { skipped: true };
    await sanityWriteClient.patch(projectId).set({ status: "archived" }).commit();
    return { archived: true, projectId };
  }

  // ── Context hydration ───────────────────────────────────────────────────────

  private async _hydrateContext(ctx: ExecutionContext): Promise<void> {
    const fetches: Array<Promise<void>> = [];

    if (ctx.entityType === "invoice" && !ctx.data.invoice) {
      fetches.push(
        sanityServer.fetch(`*[_id == $id][0]{ _id, number, amountCents, status, dueDate, clientName, clientId }`, { id: ctx.entityId })
          .then((d) => { ctx.data.invoice = d ?? {}; })
      );
    }
    if (ctx.entityType === "contract" && !ctx.data.contract) {
      fetches.push(
        sanityServer.fetch(`*[_id == $id][0]{ _id, title, status, clientName, clientId }`, { id: ctx.entityId })
          .then((d) => { ctx.data.contract = d ?? {}; })
      );
    }
    if (ctx.entityType === "pmProject" && !ctx.data.project) {
      fetches.push(
        sanityServer.fetch(`*[_id == $id][0]{ _id, name, status, budget }`, { id: ctx.entityId })
          .then((d) => { ctx.data.project = d ?? {}; })
      );
    }
    if ((ctx.entityType === "lead" || ctx.entityType === "contact") && !ctx.data.lead) {
      fetches.push(
        sanityServer.fetch(`*[_id == $id][0]{ _id, name, email, stage, value, source }`, { id: ctx.entityId })
          .then((d) => { ctx.data.lead = d ?? {}; })
      );
    }

    if (ctx.clientId && !ctx.data.client) {
      fetches.push(
        sanityServer.fetch(`*[_id == $id][0]{ _id, name, email, company, tags, status }`, { id: ctx.clientId })
          .then((d) => { ctx.data.client = d ?? {}; })
      );
    }

    await Promise.all(fetches);
  }

  // ── Step helpers ────────────────────────────────────────────────────────────

  private async _createStep(runId: string, node: AutomationNode): Promise<string> {
    const step = await sanityWriteClient.create({
      _type: "automationRunStep",
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: summariseNode(node),
      status: "pending",
      inputData: {},
      outputData: null,
      error: null,
    });
    return step._id;
  }

  private async _completeStep(stepId: string, outputData: Record<string, unknown>): Promise<void> {
    await sanityWriteClient.patch(stepId).set({
      status: "completed",
      outputData,
      executedAt: new Date().toISOString(),
    }).commit();
  }

  private async _failRun(runId: string, error: string): Promise<void> {
    await sanityWriteClient.patch(runId).set({
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    }).commit();
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const automationEngine = new AutomationEngine();
