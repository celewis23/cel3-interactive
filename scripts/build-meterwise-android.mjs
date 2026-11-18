import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const localTools = path.join(root, '.android-tools');
const localJdk = existsSync(localTools) ? readdirSync(localTools).find(name => name.startsWith('jdk-')) : null;
const javaHome = process.env.JAVA_HOME || (localJdk && path.join(localTools, localJdk));
const env = { ...process.env, DEBUG: '', ...(javaHome ? { JAVA_HOME: javaHome } : {}) };
if (!env.ANDROID_HOME && existsSync(path.join(localTools, 'sdk/platforms'))) env.ANDROID_HOME = path.join(localTools, 'sdk');
if (!env.GRADLE_USER_HOME) env.GRADLE_USER_HOME = path.join(localTools, 'gradle-cache');
function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, { cwd: android, env: { ...env, ...extraEnv }, stdio: 'inherit', shell: command.endsWith('.bat') });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
}
const signingFile = path.join(android, 'signing.properties');
const keyFile = path.join(android, 'meterwise-release.jks');
if (!existsSync(signingFile)) {
  if (existsSync(keyFile)) throw new Error('Signing key exists but signing.properties is missing. Restore the original signing configuration.');
  const password = randomBytes(32).toString('hex');
  const keytool = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool') : 'keytool';
  run(keytool, ['-genkeypair', '-keystore', keyFile, '-storepass:env', 'METERWISE_SIGNING_PASSWORD', '-keypass:env', 'METERWISE_SIGNING_PASSWORD',
    '-alias', 'meterwise', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=CEL3 Interactive Meterwise', '-noprompt'], { METERWISE_SIGNING_PASSWORD: password });
  writeFileSync(signingFile, `storeFile=meterwise-release.jks\nstorePassword=${password}\nkeyAlias=meterwise\nkeyPassword=${password}\n`, { mode: 0o600 });
  console.log('Created private release signing files in android/. Back these up securely; app updates require the same key.');
}
const bundledGradle = path.join(localTools, 'gradle-8.9/bin', process.platform === 'win32' ? 'gradle.bat' : 'gradle');
const wrapper = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const gradle = existsSync(bundledGradle) ? bundledGradle : existsSync(wrapper) ? wrapper : 'gradle';
const args = ['--no-daemon', 'assembleRelease', 'lintRelease'];
if (process.env.METERWISE_BACKOFFICE_URL) {
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?$/.test(process.env.METERWISE_BACKOFFICE_URL)) throw new Error('METERWISE_BACKOFFICE_URL must be an HTTPS origin without a trailing slash');
  args.push(`-PbackofficeUrl=${process.env.METERWISE_BACKOFFICE_URL}`);
}
run(gradle, args);
const apk = path.join(android, 'app/build/outputs/apk/release/app-release.apk');
const target = path.join(root, 'public/downloads/meterwise.apk');
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(apk, target);
const sha256 = createHash('sha256').update(readFileSync(target)).digest('hex');
writeFileSync(`${target}.sha256`, `${sha256}  meterwise.apk\n`);
console.log(`Published local APK: public/downloads/meterwise.apk\nSHA-256: ${sha256}`);
