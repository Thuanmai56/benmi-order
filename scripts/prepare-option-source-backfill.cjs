/* Prepare reviewable canonical groups from explicit legacy category mappings.
 * node scripts/prepare-option-source-backfill.cjs catalogs.json mappings.json
 * No restaurant names or category slugs determine runtime behavior.
 */
const fs = require('node:fs');
function prepare(catalog, mapping) {
  const parent = catalog.categories.find(c => c.id === mapping.parentCategoryId);
  const source = catalog.categories.find(c => c.id === mapping.sourceCategoryId);
  if (!parent || !source || parent.id === source.id || parent.tenant_id !== source.tenant_id)
    throw new Error('INVALID_CATEGORY_MAPPING');
  const products = catalog.products.filter(p => p.category_id === source.id);
  if (!products.length) throw new Error('EMPTY_OPTION_SOURCE');
  const id = `ug_legacy_source_${parent.id}_${source.id}`;
  if (catalog.groups.some(g => g.id === id)) throw new Error('GROUP_ALREADY_MIGRATED');
  const first = products.find(p => !p.is_out_of_stock && (!p.out_of_stock_until || Date.parse(p.out_of_stock_until) <= Date.now())) || products[0];
  return {
    id, name: mapping.name, revision: 0, minSelection: 1, maxSelection: 1,
    allowRepeats: false, included: false,
    sources: [{type: 'category', categoryId: source.id}],
    labels: mapping.labels || {},
    options: [{id: `uo_${id}_${first.id}`, productId: first.id, name: first.name, price: 0, quantity: 1, isDefault: true}],
    itemIds: catalog.products.filter(p => p.category_id === parent.id).map(p => p.id),
    categoryIds: [parent.id],
  };
}
module.exports = {prepare};
if (require.main === module) {
  const catalogs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const mappings = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  console.log(JSON.stringify(mappings.map(mapping => ({tenantId: mapping.tenantId, group: prepare(catalogs[mapping.tenantId], mapping)})), null, 2));
}
