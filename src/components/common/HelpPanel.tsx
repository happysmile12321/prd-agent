import React from 'react';
import { Box, Text } from 'ink';
import { defaultKeyBindings } from '../../types/config';

export const HelpPanel: React.FC = () => {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="#06b6d4" underline>
          Keyboard Shortcuts
        </Text>
      </Box>

      {defaultKeyBindings.map((group) => (
        <Box key={group.title} flexDirection="column" marginBottom={1}>
          <Text bold>
            {group.title}
          </Text>
          {group.items.map((item) => (
            <Box key={item.key}>
              <Text color="#06b6d4" bold>
                {item.key.padEnd(12)}
              </Text>
              <Text dimColor>{item.description}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>
          Press '?' or 'ESC' to close
        </Text>
      </Box>
    </Box>
  );
};

// 底部帮助栏
export const HelpBar: React.FC = () => {
  const helpItems = [
    { key: 'q/ESC', desc: 'quit' },
    { key: '↑↓', desc: 'navigate' },
    { key: 'Enter', desc: 'details' },
    { key: 'n', desc: 'new' },
    { key: 'e', desc: 'edit' },
    { key: 'd', desc: 'delete' },
    { key: 'x', desc: 'done' },
    { key: '?', desc: 'help' },
  ];

  return (
    <Box
      width="100%"
      paddingX={1}
      gap={2}
    >
      {helpItems.map((item) => (
        <Box key={item.key}>
          <Text color="#06b6d4" bold>
            {item.key}
          </Text>
          <Text dimColor>
            {' '}{item.desc}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
