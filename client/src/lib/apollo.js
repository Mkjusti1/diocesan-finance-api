import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/graphql`
    : '/graphql'
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: window.__authToken__ ? `Bearer ${window.__authToken__}` : ''
  }
}));

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors?.some(e => e.message.includes('UNAUTHENTICATED'))) {
    window.__authToken__ = null;
    window.location.href = '/login';
  }
  if (networkError) console.error('Network error:', networkError);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache()
});
