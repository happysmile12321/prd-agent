import React from 'react';
import { Box, Text } from 'ink';
import { ViewState } from '../../types/state';
import { useApp } from '../../store/context';

export const Sidebar: React.FC = () => {
  const { state } = useApp();

  const views = [
    { id: ViewState.TaskList, name: 'Tasks', key: '1' },
    { id: ViewState.Filter, name: 'Filters', key: '2' },
  ];

  // 计算统计
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.status === 'done').length;
  const inProgress = state.tasks.filter((t) => t.status === 'in_progress').length;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="#475569"
      paddingX={1}
    >
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="#06b6d4">
          PRD Agent
        </Text>
      </Box>

      {/* 视图切换 */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold dimColor>
          Views
        </Text>
        {views.map((view) => (
          <Box key={view.id}>
            <Text
              color={state.currentView === view.id ? '#06b6d4' : undefined}
              bold={state.currentView === view.id}
            >
              {state.currentView === view.id ? '●' : ' '} {view.name}
            </Text>
          </Box>
        ))}
      </Box>

      {/* 统计 */}
      <Box flexDirection="column">
        <Text bold dimColor>
          Statistics
        </Text>
        <Text dimColor> Total: {total}</Text>
        <Text dimColor> Done: {done}</Text>
        <Text dimColor> In Progress: {inProgress}</Text>
      </Box>
    </Box>
  );
};
