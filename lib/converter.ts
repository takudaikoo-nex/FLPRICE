import { Item, Plan } from '../types';

/** Supabase DBから取得したItemのsnake_caseをcamelCaseに変換 */
export const convertDbItem = (item: any): Item => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    displayOrder: item.display_order || 0,
    type: item.type || 'checkbox',
    basePrice: item.base_price,
    allowedPlans: item.allowed_plans || [],
    includedInPlans: item.included_in_plans || [],
    options: item.options,
    nonTaxable: item.non_taxable,
});

/** アプリのItemをSupabase DB用のsnake_caseに変換 */
export const convertItemToDb = (item: Item): Record<string, any> => ({
    id: item.id,
    name: item.name,
    description: item.description,
    display_order: item.displayOrder,
    type: item.type,
    base_price: item.basePrice || 0,
    allowed_plans: item.allowedPlans,
    included_in_plans: item.includedInPlans,
    options: item.options,
    non_taxable: item.nonTaxable,
});

/** Supabase DBから取得したPlanを変換 */
export const convertDbPlan = (plan: any): Plan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    category: plan.category || 'funeral',
    description: plan.description || '',
});
