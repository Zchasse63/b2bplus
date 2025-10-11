import React from 'react';
import { Text as RNText, StyleSheet, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  variant?: 'heading' | 'body' | 'caption';
}

export const Text: React.FC<TextProps> = ({ variant = 'body', style, ...props }) => {
  return <RNText style={[styles[variant], style]} {...props} />;
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
  },
  caption: {
    fontSize: 12,
    color: '#666',
  },
});

