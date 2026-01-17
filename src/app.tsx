import React, { useEffect, useState } from 'react';
import { Box, render } from 'ink';
import { AppProvider, useApp } from './store/context';
import { loadTasks, saveTasks } from './utils/storage';
import { useKeymap } from './utils/keymap';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { HelpPanel, HelpBar } from './components/common/HelpPanel';
import { TaskList } from './components/task/TaskList';
import { TaskDetail } from './components/task/TaskDetail';
import { MessageType } from './types/state';
import { createTask } from './types/task';

// 主应用组件
const AppContent: React.FC = () => {
  const { state, dispatch } = useApp();
  const [cursor, setCursor] = useState(0);

  // 加载任务
  useEffect(() => {
    const tasks = loadTasks();
    dispatch({ type: 'LOAD_TASKS', payload: tasks });
  }, [dispatch]);

  // 自动保存
  useEffect(() => {
    if (state.tasks.length > 0) {
      saveTasks(state.tasks);
    }
  }, [state.tasks]);

  // 过滤后的任务列表
  const filteredTasks = state.tasks.filter((task) => {
    if (task.status === 'archived') return false;
    if (task.status === 'done' && !state.showCompleted) return false;
    if (state.filterQuery) {
      const query = state.filterQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 快捷键处理
  useKeymap(
    {
      onUp: () => {
        if (cursor > 0) {
          const newCursor = cursor - 1;
          setCursor(newCursor);
          if (filteredTasks[newCursor]) {
            dispatch({ type: 'SELECT_TASK', payload: filteredTasks[newCursor].id });
          }
        }
      },
      onDown: () => {
        if (cursor < filteredTasks.length - 1) {
          const newCursor = cursor + 1;
          setCursor(newCursor);
          if (filteredTasks[newCursor]) {
            dispatch({ type: 'SELECT_TASK', payload: filteredTasks[newCursor].id });
          }
        }
      },
      onQuestion: () => {
        dispatch({ type: 'TOGGLE_HELP' });
      },
      onEscape: () => {
        if (state.showHelp) {
          dispatch({ type: 'TOGGLE_HELP' });
        }
      },
      onQuit: () => {
        process.exit(0);
      },
      onNew: () => {
        const newTask = createTask('New Task');
        dispatch({ type: 'ADD_TASK', payload: newTask });
        dispatch({ type: 'SELECT_TASK', payload: newTask.id });
        dispatch({
          type: 'SHOW_MESSAGE',
          payload: { message: 'Task created', type: MessageType.Success },
        });
      },
      onToggle: () => {
        if (state.selectedTaskId) {
          dispatch({ type: 'TOGGLE_TASK_STATUS', payload: state.selectedTaskId });
          dispatch({
            type: 'SHOW_MESSAGE',
            payload: { message: 'Task status updated', type: MessageType.Success },
          });
        }
      },
    },
    !state.showHelp
  );

  // 帮助视图
  if (state.showHelp) {
    return <HelpPanel />;
  }

  // 主视图
  return (
    <Box flexDirection="column" height="100%">
      {/* 主内容区 */}
      <Box flexGrow={1}>
        <Sidebar />
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="#475569"
          paddingX={1}
        >
          <TaskList />
        </Box>
        <TaskDetail />
      </Box>

      {/* 状态栏 */}
      <StatusBar />

      {/* 帮助栏 */}
      <HelpBar />
    </Box>
  );
};

// App 组件（带 Provider）
export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

// 渲染函数（用于 CLI 入口）
export const runApp = () => {
  render(<App />);
};
