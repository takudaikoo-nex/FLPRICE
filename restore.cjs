const fs = require('fs');
const { ITEMS } = require('./constants.js');
const recover = JSON.parse(fs.readFileSync('recover_data.json', 'utf8')).items;

const toPgArray = (arr) => arr && arr.length > 0 ? `ARRAY['${arr.join("','")}']` : `ARRAY[]::text[]`;

let sql = '-- ================================================\n--  Restored Items Data Update\n-- ================================================\nDELETE FROM items;\n\n';

for (let rItem of recover) {
  const cItem = ITEMS.find(i => i.id === rItem.id);
  // use cItem plans if exists, otherwise rItem plans
  const allowed = cItem ? cItem.allowedPlans : rItem.allowedPlans;
  const included = cItem ? cItem.includedInPlans : rItem.includedInPlans;
  let optStr = 'NULL';
  
  if (rItem.options) {
      // Merge planPrices into options if they exist in cItem, to ensure option prices are preserved for new plans
      if (cItem && cItem.options) {
          rItem.options.forEach(ropt => {
              const copt = cItem.options.find(co => co.id === ropt.id);
              if (copt) {
                  ropt.allowedPlans = copt.allowedPlans;
                  ropt.planPrices = copt.planPrices;
              }
          });
      }
      optStr = `'${JSON.stringify(rItem.options)}'::jsonb`;
  }
  
  const values = [
    rItem.id,
    `'${rItem.name.replace(/'/g, "''")}'`,
    `'${rItem.description.replace(/'/g, "''")}'`,
    rItem.displayOrder || 0,
    `'${rItem.type}'`,
    rItem.basePrice || 0,
    toPgArray(allowed),
    toPgArray(included),
    optStr,
    rItem.nonTaxable === true ? 'true' : 'false'
  ];
  sql += `INSERT INTO items (id, name, description, display_order, type, base_price, allowed_plans, included_in_plans, options, non_taxable) \nVALUES (${values.join(', ')});\n`;
}
fs.writeFileSync('update_restored.sql', sql);
console.log('Restored SQL generated.');
