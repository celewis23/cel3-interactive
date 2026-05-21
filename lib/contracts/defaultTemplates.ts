import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export type ContractTemplateSummary = {
  _id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  _createdAt: string;
};

type StarterContractTemplate = {
  _id: string;
  name: string;
  category: string;
  variables: string[];
  body: string;
};

const STANDARD_VARIABLES = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "projectName",
  "contractNumber",
  "contractDate",
  "startDate",
  "endDate",
  "totalAmount",
  "paymentTerms",
];

const STARTER_CONTRACT_TEMPLATES: StarterContractTemplate[] = [
  {
    _id: "contractTemplate.website-redesign",
    name: "Website Redesign Agreement",
    category: "service-agreement",
    variables: [
      ...STANDARD_VARIABLES,
      "existingWebsiteUrl",
      "redesignScope",
      "revisionRounds",
      "launchTarget",
      "hostingProvider",
      "monthlyMaintenanceFee",
      "maintenanceTerms",
    ],
    body: `
      <h2>Website Redesign Agreement</h2>
      <p>This Website Redesign Agreement ("Agreement") is entered into on {{contractDate}} between CEL3 Interactive ("Provider") and {{clientName}}{{clientCompany}} ("Client").</p>
      <h3>1. Project</h3>
      <p>Provider will redesign the website for {{projectName}}. Existing website: {{existingWebsiteUrl}}.</p>
      <p><strong>Scope:</strong> {{redesignScope}}</p>
      <h3>2. Timeline</h3>
      <p>Work is expected to begin on {{startDate}} and target launch is {{launchTarget}}. Final completion target: {{endDate}}.</p>
      <h3>3. Revisions</h3>
      <p>The project includes {{revisionRounds}} revision round(s). Additional revisions or scope changes may require a written change order.</p>
      <h3>4. Fees and Payment</h3>
      <p>Total project amount: {{totalAmount}}. Payment terms: {{paymentTerms}}.</p>
      <h3>5. Hosting and Maintenance</h3>
      <p>Hosting provider: {{hostingProvider}}. Monthly maintenance fee: {{monthlyMaintenanceFee}}. Maintenance terms: {{maintenanceTerms}}.</p>
      <h3>6. Client Responsibilities</h3>
      <p>Client will provide timely feedback, approvals, content, brand assets, access credentials, and other materials needed for completion.</p>
      <h3>7. Ownership</h3>
      <p>Upon full payment, Client owns the final approved website deliverables, excluding Provider tools, reusable code, licensed assets, third-party services, and pre-existing intellectual property.</p>
      <h3>8. Approval</h3>
      <p>By signing this Agreement, both parties agree to the project terms above.</p>
    `,
  },
  {
    _id: "contractTemplate.cel3-funded-web-app",
    name: "CEL3-Funded Web Application Build + Hosting/Maintenance",
    category: "service-agreement",
    variables: [
      ...STANDARD_VARIABLES,
      "applicationScope",
      "hostingFee",
      "maintenanceFee",
      "minimumTerm",
      "clientResponsibilities",
      "ownershipTerms",
      "terminationTerms",
    ],
    body: `
      <h2>CEL3-Funded Web Application Build + Hosting/Maintenance Agreement</h2>
      <p>This Agreement is entered into on {{contractDate}} between CEL3 Interactive ("Provider") and {{clientName}}{{clientCompany}} ("Client") for {{projectName}}.</p>
      <h3>1. Funded Build</h3>
      <p>Provider will fund the web application design and build described below. Client is not responsible for the initial design and development fee unless separately agreed in writing.</p>
      <p><strong>Application scope:</strong> {{applicationScope}}</p>
      <h3>2. Hosting and Maintenance Fees</h3>
      <p>Client agrees to pay hosting and maintenance fees for the application. Hosting fee: {{hostingFee}}. Maintenance fee: {{maintenanceFee}}. Payment terms: {{paymentTerms}}.</p>
      <h3>3. Term</h3>
      <p>The service term begins on {{startDate}} and continues for a minimum term of {{minimumTerm}}, unless terminated according to this Agreement. Current target end date or renewal review date: {{endDate}}.</p>
      <h3>4. Client Responsibilities</h3>
      <p>{{clientResponsibilities}}</p>
      <h3>5. Ownership and Platform Rights</h3>
      <p>{{ownershipTerms}}</p>
      <p>Provider may retain ownership of reusable systems, frameworks, administrative tools, source architecture, deployment workflows, and other platform components used to create or operate the application.</p>
      <h3>6. Maintenance</h3>
      <p>Maintenance may include uptime monitoring, platform updates, routine fixes, backups, security updates, and reasonable support related to the hosted application.</p>
      <h3>7. Termination</h3>
      <p>{{terminationTerms}}</p>
      <h3>8. Approval</h3>
      <p>By signing this Agreement, both parties agree to the hosting, maintenance, payment, and funded-build terms above.</p>
    `,
  },
];

const CONTRACT_TEMPLATE_FIELDS = `
  _id, name, category, body, variables, _createdAt
`;

export async function ensureDefaultContractTemplates(): Promise<ContractTemplateSummary[]> {
  const starterIds = STARTER_CONTRACT_TEMPLATES.map((template) => template._id);
  const existingIds = await sanityServer.fetch<string[]>(`*[_type == "contractTemplate" && _id in $ids]._id`, {
    ids: starterIds,
  });
  const existingIdSet = new Set(existingIds);

  for (const template of STARTER_CONTRACT_TEMPLATES) {
    if (existingIdSet.has(template._id)) continue;

    await sanityWriteClient.createIfNotExists({
      _id: template._id,
      _type: "contractTemplate",
      name: template.name,
      category: template.category,
      body: template.body.trim(),
      variables: template.variables,
      createdAt: new Date().toISOString(),
    });
  }

  return sanityServer.fetch<ContractTemplateSummary[]>(
    `*[_type == "contractTemplate"] | order(name asc) {
      ${CONTRACT_TEMPLATE_FIELDS}
    }`
  );
}

export async function listContractTemplatesByCreatedAt(): Promise<ContractTemplateSummary[]> {
  await ensureDefaultContractTemplates();

  return sanityServer.fetch<ContractTemplateSummary[]>(
    `*[_type == "contractTemplate"] | order(_createdAt desc) {
      ${CONTRACT_TEMPLATE_FIELDS}
    }`
  );
}
