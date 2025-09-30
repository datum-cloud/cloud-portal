import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { ColumnDef } from '@tanstack/react-table';

export type PolicyBinding = IPolicyBindingControlResponse;
export type PolicyBindingColumn = ColumnDef<PolicyBinding>;
