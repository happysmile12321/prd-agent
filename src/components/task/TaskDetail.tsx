import React from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/context';
import { TaskStatus, TaskPriority } from '../../types/task';

export const TaskDetail: React.FC = () => {
  const { state } = useApp();

  const task = state.tasks.find((t) => t.id === state.selectedTaskId);

  if (!task) {
    return (
      <Box paddingX={1}>
        <Text color="#64748b">No task selected</Text>
      </Box>
    );
  }

  // 状态文本
  const statusText = (): string => {
    switch (task.status) {
      case TaskStatus.Todo:
        return 'TODO';
      case TaskStatus.InProgress:
        return 'IN PROGRESS';
      case TaskStatus.Done:
        return 'DONE';
      case TaskStatus.Archived:
        return 'ARCHIVED';
    }
  };

  // 状态颜色
  const statusColor = (): string => {
    switch (task.status) {
      case TaskStatus.Done:
        return '#22c55e';
      case TaskStatus.InProgress:
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  // 优先级文本
  const priorityText = (): string => {
    switch (task.priority) {
      case TaskPriority.Urgent:
        return 'Urgent';
      case TaskPriority.High:
        return 'High';
      case TaskPriority.Medium:
        return 'Medium';
      case TaskPriority.Low:
        return 'Low';
    }
  };

  // 优先级颜色
  const priorityColor = (): string => {
    switch (task.priority) {
      case TaskPriority.Urgent:
        return '#ef4444';
      case TaskPriority.High:
        return '#f97316';
      case TaskPriority.Medium:
        return '#3b82f6';
      case TaskPriority.Low:
        return '#64748b';
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} width={40}>
      <Box marginBottom={1}>
        <Text bold color="#06b6d4">
          Task Details
        </Text>
      </Box>

      {/* 标题 */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="#94a3b8" dimColor>Title</Text>
        <Text>{task.title}</Text>
      </Box>

      {/* 状态 */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="#94a3b8" dimColor>Status</Text>
        <Text color={statusColor()}>{statusText()}</Text>
      </Box>

      {/* 优先级 */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="#94a3b8" dimColor>Priority</Text>
        <Text color={priorityColor()}>{priorityText()}</Text>
      </Box>

      {/* 描述 */}
      {task.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="#94a3b8" dimColor>Description</Text>
          <Text>{task.description}</Text>
        </Box>
      )}

      {/* 标签 */}
      {task.tags.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="#94a3b8" dimColor>Tags</Text>
          <Text>{task.tags.join(', ')}</Text>
        </Box>
      )}

      {/* 元数据 */}
      <Box marginTop={1}>
        <Text dimColor color="#64748b">
          Created: {new Date(task.createdAt).toLocaleDateString()}
        </Text>
      </Box>
      <Box>
        <Text dimColor color="#64748b">
          Updated: {new Date(task.updatedAt).toLocaleDateString()}
        </Text>
      </Box>
    </Box>
  );
};
