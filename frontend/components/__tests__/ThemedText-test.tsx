import * as React from "react";
import { act } from "@testing-library/react-native";
import renderer from "react-test-renderer";

import { ThemedText } from "../ThemedText";

it(`renders correctly`, () => {
  let tree;
  act(() => {
    tree = renderer.create(<ThemedText>Snapshot test!</ThemedText>).toJSON();
  });

  expect(tree).toMatchSnapshot();
});
