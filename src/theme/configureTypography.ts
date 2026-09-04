import React from 'react';
import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { fontForWeight, fontFamilies } from './typography';

let configured = false;

const resolveInterStyle = (style: StyleProp<TextStyle>): TextStyle => {
  const flattened = StyleSheet.flatten(style) || {};
  const family = typeof flattened.fontFamily === 'string' ? flattened.fontFamily : fontForWeight(flattened.fontWeight);

  return {
    fontFamily: family || fontFamilies.regular,
    fontWeight: 'normal' as TextStyle['fontWeight'],
  };
};

type RenderableComponent = typeof Text | typeof TextInput;
type RenderableWithPatch = RenderableComponent & {
  render?: (...args: unknown[]) => React.ReactElement;
};

const patchTextComponent = (Component: RenderableComponent) => {
  const target = Component as RenderableWithPatch;
  const originalRender = target.render;
  if (!originalRender) return;

  target.render = function renderWithInter(...args: unknown[]) {
    const element = originalRender.apply(this, args);
    const originalStyle = element.props?.style as StyleProp<TextStyle>;

    return React.cloneElement(element, {
      style: [originalStyle, resolveInterStyle(originalStyle)],
    });
  };
};

export const configureTypography = () => {
  if (configured) return;
  configured = true;

  patchTextComponent(Text);
  patchTextComponent(TextInput);
};


