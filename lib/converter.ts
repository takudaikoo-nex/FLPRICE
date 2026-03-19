import { Item, Plan } from '../types';

/** Supabase DBから取得したItemのsnake_caseをcamelCaseに変換 */
export const convertDbItem = (item: any): Item => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    displayOrder: item.display_order || 0,
    basePrice: item.base_price || 0,
    allowedPlans: item.allowed_plans || [],
});

/** アプリのItemをSupabase DB用のsnake_caseに変換 */
export const convertItemToDb = (item: Item): Record<string, any> => ({
    id: item.id,
    name: item.name,
    description: item.description,
    display_order: item.displayOrder,
    base_price: item.basePrice || 0,
    allowed_plans: item.allowedPlans,
});

/** Supabase DBから取得したPlanを変換 */
export const convertDbPlan = (plan: any): Plan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    description: plan.description || '',
});
