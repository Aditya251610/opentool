import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export default function CommandInput({ onSubmit, placeholder = '' }: Props) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      const submitted = value;
      setValue('');
      onSubmit(submitted);
      return;
    }

    if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta || key.escape) return;
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) return;
    if (key.tab) return;

    if (input) {
      setValue(v => v + input);
    }
  });

  const showPlaceholder = value.length === 0;

  return (
    <Box>
      <Text color="cyan" bold>❯ </Text>
      {showPlaceholder ? (
        <Text dimColor>{placeholder}<Text color="cyan">█</Text></Text>
      ) : (
        <Text color="white">{value}<Text color="cyan">█</Text></Text>
      )}
    </Box>
  );
}
