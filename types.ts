// Data Entities
export interface BaseEntity {
  id: string;
  name: string;
}

export interface Department extends BaseEntity {}

export interface Process extends BaseEntity {
  departmentId: string;
}

export interface ProductName extends BaseEntity {
  processId: string;
}

export interface CarModel extends BaseEntity {
  productNameId: string;
}

export interface ProductCode {
  id: string;
  code: string;
  carModelId: string;
}

export interface Issue extends BaseEntity {}
export interface Reporter extends BaseEntity {}
export interface Measure extends BaseEntity {}

// Aggregate Data Store for Management
export interface HierarchyData {
  departments: Department[];
  processes: Process[];
  productNames: ProductName[];
  carModels: CarModel[];
  productCodes: ProductCode[];
  issues: Issue[];
  reporters: Reporter[];
  measures: Measure[];
}

// Form Data
export interface FeedbackForm {
  departmentId: string;
  processId: string;
  productNameId: string;
  carModelId: string;
  productCodeId: string;
  issueId: string;
  quantityPreset: '1' | '2' | '3' | '5' | 'Batch';
  quantity: number;
  measureIds: string[];
  grade: 'V1' | 'V2';
  reporterId: string;
}

// History
export interface HistoryRecord {
  id: number;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  content: string;
  formData: FeedbackForm;
}

// Stats: { date: { carModelId: { issueId: count } } }
export interface DailyStats {
  [date: string]: {
    [carModelId: string]: {
      [issueId: string]: number;
    };
  };
}

// Navigation
export type ViewName = 'home' | 'feedback' | 'history' | 'management';
export type ManagementView = 'menu' | 'departments' | 'processes' | 'products' | 'models' | 'codes' | 'issues' | 'measures' | 'reporters';