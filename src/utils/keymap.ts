import { useInput } from 'ink';
import { useCallback } from 'react';

// 按键处理函数类型
export type KeyHandler = (input: string, key: KeyObject) => void;

interface KeyObject {
  name?: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  return: boolean;
  escape: boolean;
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
}

// 快捷键映射配置
interface KeyMapConfig {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onQuestion?: () => void;
  onQuit?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onSearch?: () => void;
  onTab?: () => void;
}

// 使用快捷键
export const useKeymap = (config: KeyMapConfig, enabled = true) => {
  useInput((input, key) => {
    if (!enabled) return;

    if (key.upArrow || input === 'k') {
      config.onUp?.();
      return;
    }

    if (key.downArrow || input === 'j') {
      config.onDown?.();
      return;
    }

    if (key.leftArrow || input === 'h') {
      config.onLeft?.();
      return;
    }

    if (key.rightArrow || input === 'l') {
      config.onRight?.();
      return;
    }

    if (key.return) {
      config.onEnter?.();
      return;
    }

    if (key.escape) {
      config.onEscape?.();
      return;
    }

    if (input === '?') {
      config.onQuestion?.();
      return;
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      config.onQuit?.();
      return;
    }

    if (input === 'n') {
      config.onNew?.();
      return;
    }

    if (input === 'e') {
      config.onEdit?.();
      return;
    }

    if (input === 'd') {
      config.onDelete?.();
      return;
    }

    if (input === 'x') {
      config.onToggle?.();
      return;
    }

    if (input === '/') {
      config.onSearch?.();
      return;
    }

    if (key.tab) {
      config.onTab?.();
      return;
    }
  });
};
