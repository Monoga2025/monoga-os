const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..', '..');
const salesRoot = path.join(root, '09_AUTO_REVENUE_ENGINE', 'sales_engine');
const generatorSource = path.join(salesRoot, 'StripeCheckoutGenerator.ts');
const generatorDist = path.join(salesRoot, 'dist', 'StripeCheckoutGenerator.js');
const nestedGeneratorSource = path.join(salesRoot, 'src', 'StripeCheckoutGenerator.ts');
const dispatcherSource = path.join(root, '09_AUTO_REVENUE_ENGINE', 'email_dispatcher', 'EmailDispatcher.ts');
const fixturePath = path.join(__dirname, 'fictional-sales-fixture.sqlite');
const resultPath = path.join(__dirname, 'probe-result.json');
const ts = require(path.join(root, 'trabajo/monoga/modulos/12_LA_GROWTH_STUDIO', 'ai_receptionist_core', 'node_modules', 'typescript'));
const Database = require(path.join(root, '09_AUTO_REVENUE_ENGINE', 'dashboard', 'node_modules', 'better-sqlite3'));

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sourceText = (file) => fs.readFileSync(file, 'utf8');
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function loadIsolatedTs(file, boundaryRequire) {
  const mod = { exports: {} };
  const code = transpile(sourceText(file));
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: boundaryRequire,
    process: { env: Object.freeze({ STRIPE_SECRET_KEY: '', WOMPI_PUBLIC_KEY: '', PAYMENT_SUCCESS_URL: '' }) },
    console,
    __dirname: path.dirname(file),
  }, { filename: file, timeout: 1000 });
  return { exports: mod.exports, transpiled: code };
}

if (fs.existsSync(fixturePath)) throw new Error('Fixture already exists; one-run probe refuses to reuse state.');

const generator = loadIsolatedTs(generatorSource, (name) => {
  // CJS __importDefault wraps this plain CommonJS-shaped module as .default.
  if (name === 'dotenv') return { config: () => ({ parsed: {} }) };
  if (name === 'stripe') throw new Error('Provider access is prohibited in this isolated probe.');
  throw new Error(`Unexpected generator dependency: ${name}`);
}).exports.StripeCheckoutGenerator;

const nestedGenerator = loadIsolatedTs(nestedGeneratorSource, (name) => {
  throw new Error(`Unexpected nested generator dependency: ${name}`);
}).exports.StripeCheckoutGenerator;

const checkout = new generator().generateCheckoutLink({
  price_usd: 199,
  prospect_id: 'fictional_prospect_001',
  business_name: 'Fictional Fixture Studio',
});

const db = new Database(fixturePath);
db.exec(`CREATE TABLE prospects (id TEXT PRIMARY KEY, business_name TEXT, city TEXT, state TEXT, email TEXT, status TEXT);
CREATE TABLE outreach_emails (id TEXT PRIMARY KEY, prospect_id TEXT, email_subject TEXT, email_body TEXT, preview_image_path TEXT, stripe_payment_link TEXT, status TEXT);`);
db.prepare('INSERT INTO prospects VALUES (?, ?, ?, ?, ?, ?)').run('fictional_prospect_001', 'Fictional Fixture Studio', 'Test City', 'TS', 'fixture@example.invalid', 'OUTREACH_READY');
db.prepare('INSERT INTO outreach_emails VALUES (?, ?, ?, ?, ?, ?, ?)').run('fictional_email_001', 'fictional_prospect_001', 'Fixture subject', 'Fixture body', null, 'https://example.invalid/fixture', 'QUEUED');
const before = {
  email: db.prepare('SELECT status FROM outreach_emails WHERE id = ?').get('fictional_email_001').status,
  prospect: db.prepare('SELECT status FROM prospects WHERE id = ?').get('fictional_prospect_001').status,
};
db.close();

const dispatcher = loadIsolatedTs(dispatcherSource, (name) => {
  if (name === 'path') return require('path');
  if (name === 'better-sqlite3') return Database;
  throw new Error(`Unexpected dispatcher dependency: ${name}`);
}).exports.EmailDispatcher;
const dispatchResult = new dispatcher(fixturePath).dispatchAll({ dryRun: true });

const afterDb = new Database(fixturePath, { readonly: true });
const after = {
  email: afterDb.prepare('SELECT status FROM outreach_emails WHERE id = ?').get('fictional_email_001').status,
  prospect: afterDb.prepare('SELECT status FROM prospects WHERE id = ?').get('fictional_prospect_001').status,
};
afterDb.close();

Promise.resolve(checkout).then((checkoutResult) => {
  const currentSource = sourceText(generatorSource);
  const currentDist = sourceText(generatorDist);
  const generatorCjs = transpile(currentSource);
  const result = {
    probe: 'isolated-root-checkout-and-dispatcher-dryrun',
    network: 'blocked by boundary stub; provider was not invoked',
    secrets: 'source evaluated with an explicit empty environment and stubbed dotenv',
    checkout: { provider: checkoutResult.provider, urlPrefix: checkoutResult.url.slice(0, 42), sessionPrefix: checkoutResult.session_id.slice(0, 8) },
    nestedSourceCheckout: {
      urlPrefix: nestedGenerator.generatePaymentLink({ priceUsd: 199, productName: 'Fictional Fixture Studio', prospectId: 'fictional_prospect_001' }).slice(0, 42),
      classification: 'string-generated URL; no provider request was available to this probe',
    },
    dispatch: { result: dispatchResult, before, after },
    identity: {
      generatorSourceSha256: sha256(currentSource),
      generatorDistSha256: sha256(currentDist),
      freshCjsTranspileSha256: sha256(generatorCjs),
      distMatchesFreshCjsTranspile: currentDist === generatorCjs,
    },
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result));
}).catch((error) => {
  fs.writeFileSync(resultPath, JSON.stringify({ probe: 'isolated-root-checkout-and-dispatcher-dryrun', error: String(error) }, null, 2) + '\n', 'utf8');
  throw error;
});
