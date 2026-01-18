import { HierarchyData, FeedbackForm } from './types';

export const STORAGE_KEYS = {
  DATA: 'qfg_data',
  HISTORY: 'qfg_history',
  STATS: 'qfg_stats',
};

export const INITIAL_DATA: HierarchyData = {
  departments: [
    { id: 'd1', name: '座椅车间' },
    { id: 'd2', name: '总装车间' },
  ],
  processes: [
    { id: 'p1', name: '顶棚出厂检', departmentId: 'd1' },
    { id: 'p2', name: '顶棚过程巡检', departmentId: 'd1' },
  ],
  productNames: [
    { id: 'pn1', name: '顶盖内饰板分装总成', processId: 'p1' },
    { id: 'pn2', name: '顶盖内饰板本体', processId: 'p1' },
  ],
  carModels: [
    { id: 'cm1', name: 'A08（天窗）', productNameId: 'pn1' },
    { id: 'cm2', name: 'A08（标准）', productNameId: 'pn1' },
  ],
  productCodes: [
    { id: 'pc1', code: '5702KJ230003AF4', carModelId: 'cm1' },
  ],
  issues: [
    { id: 'i1', name: '缺料' },
    { id: 'i2', name: '错装' },
    { id: 'i3', name: '脏污' },
    { id: 'i4', name: '结构印' },
    { id: 'i5', name: '划伤' },
  ],
  reporters: [
    { id: 'r1', name: '张三' },
    { id: 'r2', name: '李四' },
    { id: 'r3', name: '王二麻子' },
  ],
  measures: [
    { id: 'm1', name: '隔离' },
    { id: 'm2', name: '返工' },
    { id: 'm3', name: '报废' },
    { id: 'm4', name: '排查' },
  ],
};

export const DEFAULT_FORM: FeedbackForm = {
  departmentId: '',
  processId: '',
  productNameId: '',
  carModelId: '',
  productCodeId: '',
  issueId: '',
  quantityPreset: '1',
  quantity: 1,
  measureIds: [],
  grade: 'V2',
  reporterId: '',
};

export const QUANTITY_PRESETS = [
  { value: '1', label: '1件', text: '1件' },
  { value: '2', label: '2件', text: '2件' },
  { value: '3', label: '3件', text: '连续3件' },
  { value: '5', label: '5件', text: '间接5件' },
  { value: 'Batch', label: '批量', text: '批量' },
];