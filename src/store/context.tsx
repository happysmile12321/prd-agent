import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Action, reducer, initialState } from '../types/state';

// Context 类型
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

// 创建 Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider 组件
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// 自定义 Hook
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
