import { PLANS, ITEMS } from './constants';
import * as fs from 'fs';

let sql = '-- ================================================\n';
sql += '--  Plans Data Update\n';
sql += '-- ================================================\n';
sql += 'DELETE FROM plans;\n\n';

for (const plan of PLANS) {
    const id = plan.id.replace(/'/g, "''");
    const name = plan.name.replace(/'/g, "''");
    const category = plan.category.replace(/'/g, "''");
    const desc = plan.description.replace(/'/g, "''");
    
    sql += `INSERT INTO plans (id, name, price, category, description) VALUES ('${id}', '${name}', ${plan.price}, '${category}', '${desc}');\n`;
}

sql += '\n-- ================================================\n';
sql += '--  Items Data Update\n';
sql += '-- ================================================\n';
sql += 'DELETE FROM items;\n\n';

for (const item of ITEMS) {
    const id = item.id;
    const name = item.name.replace(/'/g, "''");
    const desc = item.description.replace(/'/g, "''");
    const displayOrder = item.displayOrder || 0;
    const type = item.type;
    const basePrice = item.basePrice || 0;
    
    const allowedPlansStr = item.allowedPlans.length > 0 ? `ARRAY[${item.allowedPlans.map(p => `'${p}'`).join(',')}]` : `ARRAY[]::text[]`;
    const includedInPlansStr = item.includedInPlans.length > 0 ? `ARRAY[${item.includedInPlans.map(p => `'${p}'`).join(',')}]` : `ARRAY[]::text[]`;
    
    let optionsJson = 'NULL';
    if (item.options) {
        optionsJson = `'${JSON.stringify(item.options).replace(/'/g, "''")}'::jsonb`;
    }
    
    const nonTaxable = item.nonTaxable ? 'true' : 'false';

    sql += `INSERT INTO items (id, name, description, display_order, type, base_price, allowed_plans, included_in_plans, options, non_taxable) 
VALUES (${id}, '${name}', '${desc}', ${displayOrder}, '${type}', ${basePrice}, ${allowedPlansStr}, ${includedInPlansStr}, ${optionsJson}, ${nonTaxable});\n`;
}

fs.writeFileSync('update_supabase.sql', sql);
console.log('update_supabase.sql generated successfully.');
