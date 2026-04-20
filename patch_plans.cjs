const fs = require('fs');

let content = fs.readFileSync('admin/components/PlansManager.tsx', 'utf8');

const importsToAdd = `
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const SortablePlanCard = ({ plan, onEdit, onDelete }: { plan: Plan; onEdit: (p: Plan) => void; onDelete: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: plan.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative'>
            <button
                {...attributes}
                {...listeners}
                className='absolute left-2 top-4 p-1 text-gray-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing'
                title='ドラッグで並び替え'
            >
                <GripVertical size={20} />
            </button>
            <div className='pl-8'>
                <div className='flex justify-between items-start mb-2'>
                    <span className={\`text-xs font-bold px-2 py-1 rounded \${plan.category === 'cremation' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                        {plan.category === 'cremation' ? '火葬式' : '葬儀'}
                    </span>
                    <div className='flex gap-2'>
                        <button onClick={() => onEdit(plan)} className='p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors'><Edit size={18} /></button>
                        <button onClick={() => onDelete(plan.id)} className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'><Trash2 size={18} /></button>
                    </div>
                </div>
                <h4 className='text-lg font-bold text-gray-800 mb-1'>{plan.name}</h4>
                <p className='text-2xl font-bold text-emerald-600 mb-3'>¥{plan.price.toLocaleString()}</p>
                <p className='text-sm text-gray-500 line-clamp-2'>{plan.description}</p>
                <div className='mt-3 text-xs text-gray-400'>ID: {plan.id}</div>
            </div>
        </div>
    );
};
`;

content = content.replace("import { convertDbItem, convertDbPlan } from '../../lib/converter';", "import { convertDbItem, convertDbPlan } from '../../lib/converter';\n" + importsToAdd);

const sensorsCode = `    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );`;

content = content.replace('    const [isDrawerOpen, setIsDrawerOpen] = useState(false);', sensorsCode);

const handleDragEndCode = `
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = plans.findIndex(p => p.id === active.id);
        const newIndex = plans.findIndex(p => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(plans, oldIndex, newIndex);
        setPlans(reordered);

        try {
            const updates = reordered.map((plan, idx) => ({
                id: plan.id,
                display_order: idx + 1,
            }));

            for (const u of updates) {
                const { error } = await supabase
                    .from('plans')
                    .update({ display_order: u.display_order })
                    .eq('id', u.id);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error reordering plans:', error);
            alert('並び替えに失敗しました');
            await fetchData();
        }
    };
`;

content = content.replace('    const handleDelete = async (id: string) => {', handleDragEndCode + '    const handleDelete = async (id: string) => {');

const newGrid = `<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={plans.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => (
                            <SortablePlanCard key={plan.id} plan={plan} onEdit={startEdit} onDelete={handleDelete} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>`;

// Find the grid to replace. In PlansManager, it's lines 342-377
const gridStartPattern = '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
const splitParts = content.split(gridStartPattern);
if (splitParts.length === 2) {
    // find the closing div of the grid.
    const remaining = splitParts[1];
    const closingDivIndex = remaining.indexOf('</div>\n        </div>\n    );\n};');
    const beforeGrid = splitParts[0];
    const afterGrid = remaining.substring(closingDivIndex);
    content = beforeGrid + newGrid + afterGrid;
}

content = content.replace("supabase.from('plans').select('*').order('id')", "supabase.from('plans').select('*').order('display_order', { ascending: true })");

fs.writeFileSync('admin/components/PlansManager.tsx', content);
console.log('PlansManager.tsx updated.');
