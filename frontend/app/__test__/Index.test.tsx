import * as React from "react";
import renderer from "react-test-renderer";

import Index from "../(tabs)/index";

// Main test case
it(`renders correctly`, () => {
  const tree = renderer.create(<Index />).toJSON();

  expect(tree).toMatchSnapshot();
  expect(tree).toBeDefined();
  expect(tree).not.toBeNull();
});
