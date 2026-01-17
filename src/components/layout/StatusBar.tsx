import React from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/context';
import { MessageType } from '../../types/state';

export const StatusBar: React.FC = () => {
  const { state } = useApp();

  const renderMessage = () => {
    if (!state.messageVisible || !state.message) {
      return <Text dimColor>PRD Agent</Text>;
    }

    switch (state.messageType) {
      case MessageType.Success:
        return (
          <Text color="#22c55e">
            ✓ {state.message}
          </Text>
        );
      case MessageType.Error:
        return (
          <Text color="#ef4444">
            ✗ {state.message}
          </Text>
        );
      case MessageType.Warning:
        return (
          <Text color="#f97316">
            ⚠ {state.message}
          </Text>
        );
      default:
        return <Text color="#3b82f6">{state.message}</Text>;
    }
  };

  const selectedTask = state.tasks.find((t) => t.id === state.selectedTaskId);

  return (
    <Box
      width="100%"
      justifyContent="space-between"
    >
      <Text>{renderMessage()}</Text>
      <Text dimColor>{selectedTask?.title || ''}</Text>
      <Text dimColor>{state.tasks.length} tasks</Text>
    </Box>
  );
};
