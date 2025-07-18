// This file is auto-generated by @hey-api/openapi-ts
import type {
  DeleteResourcemanagerMiloapisComV1Alpha1CollectionNamespacedOrganizationMembershipResponse,
  ListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  CreateResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  DeleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  ReadResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  PatchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse,
  ReadResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse,
  PatchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse,
  ListResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespacesResponse,
  DeleteResourcemanagerMiloapisComV1Alpha1CollectionOrganizationResponse,
  ListResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  CreateResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  DeleteResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  ReadResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  PatchResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1OrganizationResponse,
  ReadResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse,
  PatchResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse,
  DeleteResourcemanagerMiloapisComV1Alpha1CollectionProjectResponse,
  ListResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  CreateResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  DeleteResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  ReadResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  PatchResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1ProjectResponse,
  ReadResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse,
  PatchResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse,
  ReplaceResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse,
} from './types.gen';

const ioK8sApimachineryPkgApisMetaV1ListMetaSchemaResponseTransformer = (data: any) => {
  if (data.remainingItemCount) {
    data.remainingItemCount = BigInt(data.remainingItemCount.toString());
  }
  return data;
};

const ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer = (data: any) => {
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ListMetaSchemaResponseTransformer(data.metadata);
  }
  return data;
};

export const deleteResourcemanagerMiloapisComV1Alpha1CollectionNamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<DeleteResourcemanagerMiloapisComV1Alpha1CollectionNamespacedOrganizationMembershipResponse> => {
    data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
    return data;
  };

const ioK8sApimachineryPkgApisMetaV1TimeSchemaResponseTransformer = (data: any) => {
  data = new Date(data);
  return data;
};

const ioK8sApimachineryPkgApisMetaV1ManagedFieldsEntrySchemaResponseTransformer = (data: any) => {
  if (data.time) {
    data.time = ioK8sApimachineryPkgApisMetaV1TimeSchemaResponseTransformer(data.time);
  }
  return data;
};

const ioK8sApimachineryPkgApisMetaV1ObjectMetaSchemaResponseTransformer = (data: any) => {
  if (data.creationTimestamp) {
    data.creationTimestamp = ioK8sApimachineryPkgApisMetaV1TimeSchemaResponseTransformer(
      data.creationTimestamp
    );
  }
  if (data.deletionGracePeriodSeconds) {
    data.deletionGracePeriodSeconds = BigInt(data.deletionGracePeriodSeconds.toString());
  }
  if (data.deletionTimestamp) {
    data.deletionTimestamp = ioK8sApimachineryPkgApisMetaV1TimeSchemaResponseTransformer(
      data.deletionTimestamp
    );
  }
  if (data.generation) {
    data.generation = BigInt(data.generation.toString());
  }
  if (data.managedFields) {
    data.managedFields = data.managedFields.map((item: any) => {
      return ioK8sApimachineryPkgApisMetaV1ManagedFieldsEntrySchemaResponseTransformer(item);
    });
  }
  return data;
};

const comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer = (
  data: any
) => {
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ObjectMetaSchemaResponseTransformer(
      data.metadata
    );
  }
  if (data.status) {
    if (data.status.conditions) {
      data.status.conditions = data.status.conditions.map((item: any) => {
        item.lastTransitionTime = new Date(item.lastTransitionTime);
        if (item.observedGeneration) {
          item.observedGeneration = BigInt(item.observedGeneration.toString());
        }
        return item;
      });
    }
    if (data.status.observedGeneration) {
      data.status.observedGeneration = BigInt(data.status.observedGeneration.toString());
    }
  }
  return data;
};

const comMiloapisResourcemanagerV1Alpha1OrganizationMembershipListSchemaResponseTransformer = (
  data: any
) => {
  data.items = data.items.map((item: any) => {
    return comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(item);
  });
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ListMetaSchemaResponseTransformer(data.metadata);
  }
  return data;
};

export const listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<ListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data =
      comMiloapisResourcemanagerV1Alpha1OrganizationMembershipListSchemaResponseTransformer(data);
    return data;
  };

export const createResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<CreateResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const deleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<DeleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
    return data;
  };

export const readResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<ReadResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<PatchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const replaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponseTransformer =
  async (
    data: any
  ): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const readResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponseTransformer =
  async (
    data: any
  ): Promise<ReadResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponseTransformer =
  async (
    data: any
  ): Promise<PatchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const replaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponseTransformer =
  async (
    data: any
  ): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipStatusResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationMembershipSchemaResponseTransformer(data);
    return data;
  };

export const listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespacesResponseTransformer =
  async (
    data: any
  ): Promise<ListResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespacesResponse> => {
    data =
      comMiloapisResourcemanagerV1Alpha1OrganizationMembershipListSchemaResponseTransformer(data);
    return data;
  };

export const deleteResourcemanagerMiloapisComV1Alpha1CollectionOrganizationResponseTransformer =
  async (
    data: any
  ): Promise<DeleteResourcemanagerMiloapisComV1Alpha1CollectionOrganizationResponse> => {
    data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
    return data;
  };

const comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer = (data: any) => {
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ObjectMetaSchemaResponseTransformer(
      data.metadata
    );
  }
  if (data.status) {
    if (data.status.conditions) {
      data.status.conditions = data.status.conditions.map((item: any) => {
        item.lastTransitionTime = new Date(item.lastTransitionTime);
        if (item.observedGeneration) {
          item.observedGeneration = BigInt(item.observedGeneration.toString());
        }
        return item;
      });
    }
    if (data.status.observedGeneration) {
      data.status.observedGeneration = BigInt(data.status.observedGeneration.toString());
    }
  }
  return data;
};

const comMiloapisResourcemanagerV1Alpha1OrganizationListSchemaResponseTransformer = (data: any) => {
  data.items = data.items.map((item: any) => {
    return comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(item);
  });
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ListMetaSchemaResponseTransformer(data.metadata);
  }
  return data;
};

export const listResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<ListResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationListSchemaResponseTransformer(data);
  return data;
};

export const createResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<CreateResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const deleteResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<DeleteResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
  return data;
};

export const readResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<ReadResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const patchResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<PatchResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const replaceResourcemanagerMiloapisComV1Alpha1OrganizationResponseTransformer = async (
  data: any
): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1OrganizationResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const readResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponseTransformer = async (
  data: any
): Promise<ReadResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const patchResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponseTransformer = async (
  data: any
): Promise<PatchResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
  return data;
};

export const replaceResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponseTransformer =
  async (
    data: any
  ): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1OrganizationStatusResponse> => {
    data = comMiloapisResourcemanagerV1Alpha1OrganizationSchemaResponseTransformer(data);
    return data;
  };

export const deleteResourcemanagerMiloapisComV1Alpha1CollectionProjectResponseTransformer = async (
  data: any
): Promise<DeleteResourcemanagerMiloapisComV1Alpha1CollectionProjectResponse> => {
  data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
  return data;
};

const comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer = (data: any) => {
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ObjectMetaSchemaResponseTransformer(
      data.metadata
    );
  }
  if (data.status) {
    if (data.status.conditions) {
      data.status.conditions = data.status.conditions.map((item: any) => {
        item.lastTransitionTime = new Date(item.lastTransitionTime);
        if (item.observedGeneration) {
          item.observedGeneration = BigInt(item.observedGeneration.toString());
        }
        return item;
      });
    }
  }
  return data;
};

const comMiloapisResourcemanagerV1Alpha1ProjectListSchemaResponseTransformer = (data: any) => {
  data.items = data.items.map((item: any) => {
    return comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(item);
  });
  if (data.metadata) {
    data.metadata = ioK8sApimachineryPkgApisMetaV1ListMetaSchemaResponseTransformer(data.metadata);
  }
  return data;
};

export const listResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<ListResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectListSchemaResponseTransformer(data);
  return data;
};

export const createResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<CreateResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const deleteResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<DeleteResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = ioK8sApimachineryPkgApisMetaV1StatusSchemaResponseTransformer(data);
  return data;
};

export const readResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<ReadResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const patchResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<PatchResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const replaceResourcemanagerMiloapisComV1Alpha1ProjectResponseTransformer = async (
  data: any
): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1ProjectResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const readResourcemanagerMiloapisComV1Alpha1ProjectStatusResponseTransformer = async (
  data: any
): Promise<ReadResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const patchResourcemanagerMiloapisComV1Alpha1ProjectStatusResponseTransformer = async (
  data: any
): Promise<PatchResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};

export const replaceResourcemanagerMiloapisComV1Alpha1ProjectStatusResponseTransformer = async (
  data: any
): Promise<ReplaceResourcemanagerMiloapisComV1Alpha1ProjectStatusResponse> => {
  data = comMiloapisResourcemanagerV1Alpha1ProjectSchemaResponseTransformer(data);
  return data;
};
