import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({ uri: '/graphql' });

const authLink = setContext((_, { headers }) => {
  const token = window.__authToken__;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      if (message.includes('UNAUTHENTICATED')) {
        window.__authToken__ = null;
        window.location.href = '/login';
      }
    });
  }
  if (networkError) console.error('Network error:', networkError);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
