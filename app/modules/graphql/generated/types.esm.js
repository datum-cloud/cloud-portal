export default {
    "scalars": [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        10,
        11,
        12,
        13,
        38,
        39,
        40,
        41
    ],
    "types": {
        "JSON": {},
        "DateTime": {},
        "BigInt": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_message": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_reason": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_type": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_message": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_reason": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_type": {},
        "Query": {
            "listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces": [
                22,
                {
                    "allowWatchBookmarks": [
                        10
                    ],
                    "continue": [
                        11
                    ],
                    "fieldSelector": [
                        11
                    ],
                    "labelSelector": [
                        11
                    ],
                    "limit": [
                        12
                    ],
                    "pretty": [
                        11
                    ],
                    "resourceVersion": [
                        11
                    ],
                    "resourceVersionMatch": [
                        11
                    ],
                    "sendInitialEvents": [
                        10
                    ],
                    "timeoutSeconds": [
                        12
                    ],
                    "watch": [
                        10
                    ]
                }
            ],
            "readResourcemanagerMiloapisComV1alpha1Organization": [
                34,
                {
                    "name": [
                        11,
                        "String!"
                    ],
                    "pretty": [
                        11
                    ],
                    "resourceVersion": [
                        11
                    ]
                }
            ],
            "sessions": [
                53,
                {
                    "userID": [
                        13
                    ]
                }
            ],
            "__typename": [
                11
            ]
        },
        "Boolean": {},
        "String": {},
        "Int": {},
        "ID": {},
        "io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta": {
            "annotations": [
                0
            ],
            "creationTimestamp": [
                1
            ],
            "deletionGracePeriodSeconds": [
                2
            ],
            "deletionTimestamp": [
                1
            ],
            "finalizers": [
                11
            ],
            "generateName": [
                11
            ],
            "generation": [
                2
            ],
            "labels": [
                0
            ],
            "managedFields": [
                15
            ],
            "name": [
                11
            ],
            "namespace": [
                11
            ],
            "ownerReferences": [
                16
            ],
            "resourceVersion": [
                11
            ],
            "selfLink": [
                11
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry": {
            "apiVersion": [
                11
            ],
            "fieldsType": [
                11
            ],
            "fieldsV1": [
                0
            ],
            "manager": [
                11
            ],
            "operation": [
                11
            ],
            "subresource": [
                11
            ],
            "time": [
                1
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference": {
            "apiVersion": [
                11
            ],
            "blockOwnerDeletion": [
                10
            ],
            "controller": [
                10
            ],
            "kind": [
                11
            ],
            "name": [
                11
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta": {
            "continue": [
                11
            ],
            "remainingItemCount": [
                2
            ],
            "resourceVersion": [
                11
            ],
            "selfLink": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "Mutation": {
            "createResourcemanagerMiloapisComV1alpha1Organization": [
                34,
                {
                    "pretty": [
                        11
                    ],
                    "dryRun": [
                        11
                    ],
                    "fieldManager": [
                        11
                    ],
                    "fieldValidation": [
                        11
                    ],
                    "input": [
                        47
                    ]
                }
            ],
            "deleteResourcemanagerMiloapisComV1alpha1Organization": [
                19,
                {
                    "name": [
                        11,
                        "String!"
                    ],
                    "pretty": [
                        11
                    ],
                    "dryRun": [
                        11
                    ],
                    "gracePeriodSeconds": [
                        12
                    ],
                    "ignoreStoreReadErrorWithClusterBreakingPotential": [
                        10
                    ],
                    "orphanDependents": [
                        10
                    ],
                    "propagationPolicy": [
                        11
                    ],
                    "input": [
                        45
                    ]
                }
            ],
            "patchResourcemanagerMiloapisComV1alpha1Organization": [
                34,
                {
                    "name": [
                        11,
                        "String!"
                    ],
                    "pretty": [
                        11
                    ],
                    "dryRun": [
                        11
                    ],
                    "fieldManager": [
                        11
                    ],
                    "fieldValidation": [
                        11
                    ],
                    "force": [
                        10
                    ],
                    "input": [
                        0
                    ]
                }
            ],
            "deleteSession": [
                10,
                {
                    "id": [
                        11,
                        "String!"
                    ]
                }
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_Status": {
            "apiVersion": [
                11
            ],
            "code": [
                12
            ],
            "details": [
                20
            ],
            "kind": [
                11
            ],
            "message": [
                11
            ],
            "metadata": [
                17
            ],
            "reason": [
                11
            ],
            "status": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails": {
            "causes": [
                21
            ],
            "group": [
                11
            ],
            "kind": [
                11
            ],
            "name": [
                11
            ],
            "retryAfterSeconds": [
                12
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause": {
            "field": [
                11
            ],
            "message": [
                11
            ],
            "reason": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList": {
            "apiVersion": [
                11
            ],
            "items": [
                23
            ],
            "kind": [
                11
            ],
            "metadata": [
                17
            ],
            "__typename": [
                11
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_OrganizationMembership": {
            "apiVersion": [
                11
            ],
            "kind": [
                11
            ],
            "metadata": [
                14
            ],
            "spec": [
                24
            ],
            "status": [
                28
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec": {
            "organizationRef": [
                25
            ],
            "roles": [
                26
            ],
            "userRef": [
                27
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef": {
            "name": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items": {
            "name": [
                11
            ],
            "namespace": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef": {
            "name": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status": {
            "appliedRoles": [
                29
            ],
            "conditions": [
                31
            ],
            "observedGeneration": [
                2
            ],
            "organization": [
                32
            ],
            "user": [
                33
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items": {
            "appliedAt": [
                1
            ],
            "message": [
                11
            ],
            "name": [
                11
            ],
            "namespace": [
                11
            ],
            "policyBindingRef": [
                30
            ],
            "status": [
                38
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef": {
            "name": [
                11
            ],
            "namespace": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items": {
            "lastTransitionTime": [
                1
            ],
            "message": [
                3
            ],
            "observedGeneration": [
                2
            ],
            "reason": [
                4
            ],
            "status": [
                39
            ],
            "type": [
                5
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization": {
            "displayName": [
                11
            ],
            "type": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user": {
            "avatarUrl": [
                11
            ],
            "email": [
                11
            ],
            "familyName": [
                11
            ],
            "givenName": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_Organization": {
            "apiVersion": [
                11
            ],
            "kind": [
                11
            ],
            "metadata": [
                14
            ],
            "spec": [
                35
            ],
            "status": [
                36
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec": {
            "type": [
                40
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status": {
            "conditions": [
                37
            ],
            "observedGeneration": [
                2
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items": {
            "lastTransitionTime": [
                1
            ],
            "message": [
                6
            ],
            "observedGeneration": [
                2
            ],
            "reason": [
                7
            ],
            "status": [
                41
            ],
            "type": [
                8
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_status": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_status": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_type": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_status": {},
        "io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_Input": {
            "annotations": [
                0
            ],
            "creationTimestamp": [
                1
            ],
            "deletionGracePeriodSeconds": [
                2
            ],
            "deletionTimestamp": [
                1
            ],
            "finalizers": [
                11
            ],
            "generateName": [
                11
            ],
            "generation": [
                2
            ],
            "labels": [
                0
            ],
            "managedFields": [
                43
            ],
            "name": [
                11
            ],
            "namespace": [
                11
            ],
            "ownerReferences": [
                44
            ],
            "resourceVersion": [
                11
            ],
            "selfLink": [
                11
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_Input": {
            "apiVersion": [
                11
            ],
            "fieldsType": [
                11
            ],
            "fieldsV1": [
                0
            ],
            "manager": [
                11
            ],
            "operation": [
                11
            ],
            "subresource": [
                11
            ],
            "time": [
                1
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_Input": {
            "apiVersion": [
                11
            ],
            "blockOwnerDeletion": [
                10
            ],
            "controller": [
                10
            ],
            "kind": [
                11
            ],
            "name": [
                11
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_DeleteOptions_Input": {
            "apiVersion": [
                11
            ],
            "dryRun": [
                11
            ],
            "gracePeriodSeconds": [
                2
            ],
            "ignoreStoreReadErrorWithClusterBreakingPotential": [
                10
            ],
            "kind": [
                11
            ],
            "orphanDependents": [
                10
            ],
            "preconditions": [
                46
            ],
            "propagationPolicy": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_Preconditions_Input": {
            "resourceVersion": [
                11
            ],
            "uid": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_Organization_Input": {
            "apiVersion": [
                11
            ],
            "kind": [
                11
            ],
            "metadata": [
                42
            ],
            "spec": [
                48
            ],
            "status": [
                49
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_Input": {
            "type": [
                40
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_Input": {
            "conditions": [
                50
            ],
            "observedGeneration": [
                2
            ],
            "__typename": [
                11
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_Input": {
            "lastTransitionTime": [
                1
            ],
            "message": [
                6
            ],
            "observedGeneration": [
                2
            ],
            "reason": [
                7
            ],
            "status": [
                41
            ],
            "type": [
                8
            ],
            "__typename": [
                11
            ]
        },
        "ParsedUserAgent": {
            "browser": [
                11
            ],
            "os": [
                11
            ],
            "formatted": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "GeoLocation": {
            "city": [
                11
            ],
            "country": [
                11
            ],
            "countryCode": [
                11
            ],
            "formatted": [
                11
            ],
            "__typename": [
                11
            ]
        },
        "ExtendedSession": {
            "id": [
                11
            ],
            "userUID": [
                11
            ],
            "provider": [
                11
            ],
            "ipAddress": [
                11
            ],
            "fingerprintID": [
                11
            ],
            "createdAt": [
                11
            ],
            "lastUpdatedAt": [
                11
            ],
            "userAgent": [
                51
            ],
            "location": [
                52
            ],
            "__typename": [
                11
            ]
        }
    }
}