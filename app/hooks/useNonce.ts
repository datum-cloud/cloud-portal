/**
 * Nonce Provider.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
 */
import { createContext, useContext } from 'react';

export const NonceContext = createContext<string>('');
export const NonceProvider = NonceContext.Provider;

export const useNonce = () => useContext(NonceContext);

/** The id of root's `window.ENV` script, which the client reads the nonce from. */
export const ENV_SCRIPT_ID = 'app-env';
