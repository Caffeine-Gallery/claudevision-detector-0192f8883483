export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'detectObjects' : IDL.Func([IDL.Text, IDL.Text], [IDL.Text], []),
    'getApiKey' : IDL.Func([], [IDL.Text], ['query']),
    'saveApiKey' : IDL.Func([IDL.Text], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
