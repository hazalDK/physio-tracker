import * as React from "react";
import { act } from "@testing-library/react-native";
import renderer from "react-test-renderer";

import { ThemedText } from "../ThemedText";

it("renders correctly with data", async () => {
  let tree: any;
  await act(async () => {
    tree = renderer.create(<ThemedText />);
  });

  // Allow any pending state updates and async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Then call toJSON() outside of act
  const treeJSON = tree.toJSON();
  expect(treeJSON).not.toBeNull();
  expect(treeJSON).toMatchSnapshot();
});
