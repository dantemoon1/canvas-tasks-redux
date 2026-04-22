import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import styled from 'styled-components';

const ErrorWrapper = styled.div`
  padding: 10px 0px;
`;

const ErrorDiv = styled.div`
  color: #ef4444;
  padding: 10px;
`;

export default function ErrorRender({
  error,
}: Partial<FallbackProps>): JSX.Element {
  const failureTitle = 'Tasks for Canvas Redux failed to load.';
  const failureMessage =
    'Sorry about that! Try reloading the page. If this keeps happening, there may be a bug.';
  return (
    <ErrorWrapper id="tfc-fail-load">
      <strong>{failureTitle}</strong>
      <br />
      {failureMessage}
      <ErrorDiv>{error?.message}</ErrorDiv>
    </ErrorWrapper>
  );
}
