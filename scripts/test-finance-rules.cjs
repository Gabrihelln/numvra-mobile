// Runs simulated requests through Firebase Rules testing; creates no documents.
const fs = require('node:fs');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
async function main() {
  const project = 'numvra-main';
  const auth = new GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-admin-key.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = process.env.FIREBASE_RULES_TEST_TOKEN ? new OAuth2Client() : await auth.getClient();
  if (process.env.FIREBASE_RULES_TEST_TOKEN) client.setCredentials({ access_token: process.env.FIREBASE_RULES_TEST_TOKEN });
  const owner = 'rules-test-owner';
  const account = { userId: owner, name: 'Conta teste', accountType: 'checking', accountKind: 'bank', balance: 0, currency: 'BRL', source: 'manual', isManual: true, isActive: true, institutionId: 'test', institutionName: 'Teste', openFinanceStatus: 'not_connected' };
  const category = { userId: owner, name: 'Categoria teste', icon: 'home', type: 'expense', percentage: 0, limitAmount: 0, active: true, isActive: true, enabled: true, color: '#5748FF', backgroundColor: '#F1EEFF', defaultCategoryId: 'default-moradia' };
  const transaction = { userId: owner, title: 'Teste', amount: -10, date: '2026-09-12', type: 'expense', paymentMethod: 'pix', sourceType: 'account', sourceName: 'Teste', accountId: 'test', publicId: '123456789', notes: '', transactionEvents: [], installmentGroupId: 'test', installmentNumber: 1, installmentTotal: 2 };
  const tests = [];
  const add = (label, collection, method, uid, data, previous, expectation) => tests.push({ label, test: {
    expectation, request: { path: '/databases/(default)/documents/' + collection + '/rules-test', method, auth: uid ? { uid, token: {} } : null, ...(data ? { resource: { data } } : {}) },
    ...(previous ? { resource: { data: previous } } : {}),
  } });
  for (const [collection, data] of [['accounts', account], ['budgets', category], ['transactions', transaction]]) {
    add(collection + ': create own', collection, 'create', owner, data, null, 'ALLOW');
    add(collection + ': create foreign', collection, 'create', 'other-user', data, null, 'DENY');
    add(collection + ': anonymous', collection, 'create', null, data, null, 'DENY');
    add(collection + ': read own', collection, 'get', owner, null, data, 'ALLOW');
    add(collection + ': read foreign', collection, 'get', 'other-user', null, data, 'DENY');
    add(collection + ': update own', collection, 'update', owner, data, data, 'ALLOW');
    add(collection + ': change owner', collection, 'update', 'other-user', { ...data, userId: 'other-user' }, data, 'DENY');
    add(collection + ': delete own', collection, 'delete', owner, null, data, 'ALLOW');
    add(collection + ': delete foreign', collection, 'delete', 'other-user', null, data, 'DENY');
  }
  add('category remove limit', 'budgets', 'update', owner, { ...category, limitAmount: 0 }, { ...category, limitAmount: 900 }, 'ALLOW');
  add('category delete marker', 'budgets', 'update', owner, { ...category, deleted: true, active: false }, category, 'ALLOW');
  add('category negative limit', 'budgets', 'create', owner, { ...category, limitAmount: -1 }, null, 'DENY');
  const response = await client.request({ url: 'https://firebaserules.googleapis.com/v1/projects/' + project + ':test', method: 'POST', data: {
    source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] },
    testSuite: { testCases: tests.map((item) => item.test) },
  } });
  const results = response.data.testResults || [];
  for (const [index, result] of results.entries()) console.log(result.state, tests[index].label, result.state === 'SUCCESS' ? '' : JSON.stringify(result));
  const errors = (response.data.issues || []).filter((item) => item.severity === 'ERROR');
  if (errors.length) console.error(JSON.stringify(errors));
  if (errors.length || results.length !== tests.length || results.some((item) => item.state !== 'SUCCESS')) process.exitCode = 1;
  else console.log('Passed ' + results.length + ' rule scenarios; no documents written.');
}
main().catch((error) => { console.error(error.response?.data?.error?.message || error.message); process.exitCode = 1; });
