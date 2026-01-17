import { Task } from './task';

// 视图状态
export enum ViewState {
  TaskList = 'task_list',
  TaskDetail = 'task_detail',
  Filter = 'filter',
  Help = 'help',
}

// 面板焦点
export enum PanelFocus {
  None = 'none',
  Sidebar = 'sidebar',
  Main = 'main',
  Detail = 'detail',
}

// 消息类型
export enum MessageType {
  Info = 'info',
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
}

// 应用状态
export interface AppState {
  // 数据
  tasks: Task[];
  selectedTaskId: string | null;

  // UI 状态
  currentView: ViewState;
  panelFocus: PanelFocus;

  // 过滤状态
  filterQuery: string;
  filterTags: string[];
  showCompleted: boolean;

  // 消息
  message: string;
  messageType: MessageType;
  messageVisible: boolean;

  // 帮助显示
  showHelp: boolean;
}

// Action 类型
export type Action =
  | { type: 'SELECT_TASK'; payload: string }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'SET_FOCUS'; payload: PanelFocus }
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'TOGGLE_COMPLETED' }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK_STATUS'; payload: string }
  | { type: 'SHOW_MESSAGE'; payload: { message: string; type: MessageType } }
  | { type: 'HIDE_MESSAGE' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'LOAD_TASKS'; payload: Task[] };

// 初始状态
export const initialState: AppState = {
  tasks: [],
  selectedTaskId: null,
  currentView: ViewState.TaskList,
  panelFocus: PanelFocus.Main,
  filterQuery: '',
  filterTags: [],
  showCompleted: false,
  message: '',
  messageType: MessageType.Info,
  messageVisible: false,
  showHelp: false,
};

// Reducer
export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SELECT_TASK':
      return { ...state, selectedTaskId: action.payload };

    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'SET_FOCUS':
      return { ...state, panelFocus: action.payload };

    case 'SET_FILTER':
      return { ...state, filterQuery: action.payload };

    case 'TOGGLE_COMPLETED':
      return { ...state, showCompleted: !state.showCompleted };

    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
        selectedTaskId:
          state.selectedTaskId === action.payload
            ? null
            : state.selectedTaskId,
      };

    case 'TOGGLE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload
            ? {
                ...t,
                status:
                  t.status === TaskStatus.Done
                    ? TaskStatus.Todo
                    : TaskStatus.Done,
              }
            : t
        ),
      };

    case 'SHOW_MESSAGE':
      return {
        ...state,
        message: action.payload.message,
        messageType: action.payload.type,
        messageVisible: true,
      };

    case 'HIDE_MESSAGE':
      return {
        ...state,
        messageVisible: false,
      };

    case 'TOGGLE_HELP':
      return {
        ...state,
        showHelp: !state.showHelp,
      };

    case 'LOAD_TASKS':
      return {
        ...state,
        tasks: action.payload,
        selectedTaskId:
          state.selectedTaskId ||
          (action.payload.length > 0 ? action.payload[0].id : null),
      };

    default:
      return state;
  }
};

// 引入 TaskStatus
import { TaskStatus } from './task';
