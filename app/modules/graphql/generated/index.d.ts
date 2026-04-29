import { QueryRequest, Query, MutationRequest, Mutation } from './schema';
import {
  FieldsSelection,
  GraphqlOperation,
  ClientOptions,
  ClientRequestConfig,
} from '@gqlts/runtime';
import { AxiosInstance } from 'axios';
import { Client as WSClient } from 'graphql-ws';

export * from './schema';

export declare const createClient: (options?: ClientOptions) => Client;
export declare const everything: { __scalar: boolean };
export declare const version: string;

export type Head<T extends unknown | unknown[]> = T extends [infer H, ...unknown[]] ? H : never;
export interface GraphQLError {
  message: string;
  code?: string;
  locations?: {
    line: number;
    column: number;
  }[];
  path?: string | number[];
  extensions?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Extensions {
  [key: string]: unknown;
}

export interface GraphqlResponse<D = any, E = GraphQLError[], X = Extensions> {
  data?: D;
  errors?: E;
  extensions?: X;
}

export interface Client<FI = AxiosInstance, RC = ClientRequestConfig> {
  wsClient?: WSClient;
  fetcherInstance?: FI | undefined;
  fetcherMethod: (operation: GraphqlOperation | GraphqlOperation[], config?: RC) => Promise<any>;

  query<R extends QueryRequest>(
    request: R & { __name?: string },
    config?: RC
  ): Promise<GraphqlResponse<FieldsSelection<Query, R>>>;

  mutation<R extends MutationRequest>(
    request: R & { __name?: string },
    config?: RC
  ): Promise<GraphqlResponse<FieldsSelection<Mutation, R>>>;
}

export type QueryResult<fields extends QueryRequest> = GraphqlResponse<
  FieldsSelection<Query, fields>
>;

export declare const generateQueryOp: (
  fields: QueryRequest & { __name?: string }
) => GraphqlOperation;
export type MutationResult<fields extends MutationRequest> = GraphqlResponse<
  FieldsSelection<Mutation, fields>
>;

export declare const generateMutationOp: (
  fields: MutationRequest & { __name?: string }
) => GraphqlOperation;

export declare const enumqueryListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipItemsItemsStatusAppliedRolesItemsStatus: {
  readonly Applied: 'Applied';
  readonly Pending: 'Pending';
  readonly Failed: 'Failed';
};

export declare const enumqueryListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipItemsItemsStatusConditionsItemsStatus: {
  readonly True: 'True';
  readonly False: 'False';
  readonly Unknown: 'Unknown';
};

export declare const enumqueryListResourcemanagerMiloapisComV1Alpha1OrganizationItemsItemsSpecType: {
  readonly Personal: 'Personal';
  readonly Standard: 'Standard';
};

export declare const enumqueryListResourcemanagerMiloapisComV1Alpha1OrganizationItemsItemsStatusConditionsItemsStatus: {
  readonly True: 'True';
  readonly False: 'False';
  readonly Unknown: 'Unknown';
};
