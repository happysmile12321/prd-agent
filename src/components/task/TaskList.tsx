import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/context';
import { TaskStatus, TaskPriority } from '../../types/task';

export const TaskList: React.FC = () => {
  const { state } = useApp();

  // 过滤任务
  const filteredTasks = useMemo(() => {
    return state.tasks.filter((task) => {
      // 过滤已完成的
      if (task.status === TaskStatus.Done && !state.showCompleted) {
        return false;
      }
      // 过滤已归档的
      if (task.status === TaskStatus.Archived) {
        return false;
      }
      // 搜索过滤
      if (state.filterQuery) {
        const query = state.filterQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [state.tasks, state.showCompleted, state.filterQuery]);

  const selectedIndex = useMemo(() => {
    return filteredTasks.findIndex((t) => t.id === state.selectedTaskId);
  }, [filteredTasks, state.selectedTaskId]);

  // 优先级图标
  const priorityIcon = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.Urgent:
        return '🔴';
      case TaskPriority.High:
        return '🟠';
      case TaskPriority.Medium:
        return '🟡';
      case TaskPriority.Low:
        return '🟢';
      default:
        return '⚪';
    }
  };

  // 状态图标
  const statusIcon = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.Todo:
        return '[ ]';
      case TaskStatus.InProgress:
        return '[~]';
      case TaskStatus.Done:
        return '[x]';
      default:
        return '[?]';
    }
  };

  // 状态颜色
  const statusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.Done:
        return '#22c55e';
      case TaskStatus.InProgress:
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  };

  if (filteredTasks.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No tasks found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="#06b6d4">
          Tasks
        </Text>
      </Box>

      {filteredTasks.map((task, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box
            key={task.id}
            paddingX={1}
            paddingY={1}
          >
            <Text
              color={isSelected ? '#ffffff' : statusColor(task.status)}
              inverse={isSelected}
            >
              {statusIcon(task.status)} {priorityIcon(task.priority)} {task.title}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
