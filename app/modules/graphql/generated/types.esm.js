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
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        19,
        20,
        21,
        22,
        49,
        50,
        51,
        52
    ],
    "types": {
        "JSON": {},
        "DateTime": {},
        "BigInt": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_message": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_reason": {},
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_type": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_city": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_country": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_line1": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_line2": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_postalCode": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_region": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_businessName": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_email": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_name": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_message": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_reason": {},
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_type": {},
        "Query": {
            "listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces": [
                31,
                {
                    "allowWatchBookmarks": [
                        19
                    ],
                    "continue": [
                        20
                    ],
                    "fieldSelector": [
                        20
                    ],
                    "labelSelector": [
                        20
                    ],
                    "limit": [
                        21
                    ],
                    "pretty": [
                        20
                    ],
                    "resourceVersion": [
                        20
                    ],
                    "resourceVersionMatch": [
                        20
                    ],
                    "sendInitialEvents": [
                        19
                    ],
                    "shardSelector": [
                        20
                    ],
                    "timeoutSeconds": [
                        21
                    ],
                    "watch": [
                        19
                    ]
                }
            ],
            "readResourcemanagerMiloapisComV1alpha1Organization": [
                43,
                {
                    "name": [
                        20,
                        "String!"
                    ],
                    "pretty": [
                        20
                    ],
                    "resourceVersion": [
                        20
                    ]
                }
            ],
            "sessions": [
                66,
                {
                    "userID": [
                        22
                    ]
                }
            ],
            "__typename": [
                20
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
                20
            ],
            "generateName": [
                20
            ],
            "generation": [
                2
            ],
            "labels": [
                0
            ],
            "managedFields": [
                24
            ],
            "name": [
                20
            ],
            "namespace": [
                20
            ],
            "ownerReferences": [
                25
            ],
            "resourceVersion": [
                20
            ],
            "selfLink": [
                20
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry": {
            "apiVersion": [
                20
            ],
            "fieldsType": [
                20
            ],
            "fieldsV1": [
                0
            ],
            "manager": [
                20
            ],
            "operation": [
                20
            ],
            "subresource": [
                20
            ],
            "time": [
                1
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference": {
            "apiVersion": [
                20
            ],
            "blockOwnerDeletion": [
                19
            ],
            "controller": [
                19
            ],
            "kind": [
                20
            ],
            "name": [
                20
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta": {
            "continue": [
                20
            ],
            "remainingItemCount": [
                2
            ],
            "resourceVersion": [
                20
            ],
            "selfLink": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "Mutation": {
            "createResourcemanagerMiloapisComV1alpha1Organization": [
                43,
                {
                    "pretty": [
                        20
                    ],
                    "dryRun": [
                        20
                    ],
                    "fieldManager": [
                        20
                    ],
                    "fieldValidation": [
                        20
                    ],
                    "input": [
                        58
                    ]
                }
            ],
            "deleteResourcemanagerMiloapisComV1alpha1Organization": [
                28,
                {
                    "name": [
                        20,
                        "String!"
                    ],
                    "pretty": [
                        20
                    ],
                    "dryRun": [
                        20
                    ],
                    "gracePeriodSeconds": [
                        21
                    ],
                    "ignoreStoreReadErrorWithClusterBreakingPotential": [
                        19
                    ],
                    "orphanDependents": [
                        19
                    ],
                    "propagationPolicy": [
                        20
                    ],
                    "input": [
                        56
                    ]
                }
            ],
            "patchResourcemanagerMiloapisComV1alpha1Organization": [
                43,
                {
                    "name": [
                        20,
                        "String!"
                    ],
                    "pretty": [
                        20
                    ],
                    "dryRun": [
                        20
                    ],
                    "fieldManager": [
                        20
                    ],
                    "fieldValidation": [
                        20
                    ],
                    "force": [
                        19
                    ],
                    "input": [
                        0
                    ]
                }
            ],
            "deleteSession": [
                19,
                {
                    "id": [
                        20,
                        "String!"
                    ]
                }
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_Status": {
            "apiVersion": [
                20
            ],
            "code": [
                21
            ],
            "details": [
                29
            ],
            "kind": [
                20
            ],
            "message": [
                20
            ],
            "metadata": [
                26
            ],
            "reason": [
                20
            ],
            "status": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails": {
            "causes": [
                30
            ],
            "group": [
                20
            ],
            "kind": [
                20
            ],
            "name": [
                20
            ],
            "retryAfterSeconds": [
                21
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause": {
            "field": [
                20
            ],
            "message": [
                20
            ],
            "reason": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList": {
            "apiVersion": [
                20
            ],
            "items": [
                32
            ],
            "kind": [
                20
            ],
            "metadata": [
                26
            ],
            "__typename": [
                20
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_OrganizationMembership": {
            "apiVersion": [
                20
            ],
            "kind": [
                20
            ],
            "metadata": [
                23
            ],
            "spec": [
                33
            ],
            "status": [
                37
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec": {
            "organizationRef": [
                34
            ],
            "roles": [
                35
            ],
            "userRef": [
                36
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef": {
            "name": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items": {
            "name": [
                20
            ],
            "namespace": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef": {
            "name": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status": {
            "appliedRoles": [
                38
            ],
            "conditions": [
                40
            ],
            "observedGeneration": [
                2
            ],
            "organization": [
                41
            ],
            "user": [
                42
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items": {
            "appliedAt": [
                1
            ],
            "message": [
                20
            ],
            "name": [
                20
            ],
            "namespace": [
                20
            ],
            "policyBindingRef": [
                39
            ],
            "status": [
                49
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef": {
            "name": [
                20
            ],
            "namespace": [
                20
            ],
            "__typename": [
                20
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
                50
            ],
            "type": [
                5
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization": {
            "contactEmail": [
                20
            ],
            "displayName": [
                20
            ],
            "type": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user": {
            "avatarUrl": [
                20
            ],
            "email": [
                20
            ],
            "familyName": [
                20
            ],
            "givenName": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_Organization": {
            "apiVersion": [
                20
            ],
            "kind": [
                20
            ],
            "metadata": [
                23
            ],
            "spec": [
                44
            ],
            "status": [
                47
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec": {
            "contactInfo": [
                45
            ],
            "type": [
                51
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo": {
            "address": [
                46
            ],
            "businessName": [
                12
            ],
            "email": [
                13
            ],
            "name": [
                14
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address": {
            "city": [
                6
            ],
            "country": [
                7
            ],
            "line1": [
                8
            ],
            "line2": [
                9
            ],
            "postalCode": [
                10
            ],
            "region": [
                11
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status": {
            "conditions": [
                48
            ],
            "observedGeneration": [
                2
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items": {
            "lastTransitionTime": [
                1
            ],
            "message": [
                15
            ],
            "observedGeneration": [
                2
            ],
            "reason": [
                16
            ],
            "status": [
                52
            ],
            "type": [
                17
            ],
            "__typename": [
                20
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
                20
            ],
            "generateName": [
                20
            ],
            "generation": [
                2
            ],
            "labels": [
                0
            ],
            "managedFields": [
                54
            ],
            "name": [
                20
            ],
            "namespace": [
                20
            ],
            "ownerReferences": [
                55
            ],
            "resourceVersion": [
                20
            ],
            "selfLink": [
                20
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_Input": {
            "apiVersion": [
                20
            ],
            "fieldsType": [
                20
            ],
            "fieldsV1": [
                0
            ],
            "manager": [
                20
            ],
            "operation": [
                20
            ],
            "subresource": [
                20
            ],
            "time": [
                1
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_Input": {
            "apiVersion": [
                20
            ],
            "blockOwnerDeletion": [
                19
            ],
            "controller": [
                19
            ],
            "kind": [
                20
            ],
            "name": [
                20
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_DeleteOptions_Input": {
            "apiVersion": [
                20
            ],
            "dryRun": [
                20
            ],
            "gracePeriodSeconds": [
                2
            ],
            "ignoreStoreReadErrorWithClusterBreakingPotential": [
                19
            ],
            "kind": [
                20
            ],
            "orphanDependents": [
                19
            ],
            "preconditions": [
                57
            ],
            "propagationPolicy": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "io_k8s_apimachinery_pkg_apis_meta_v1_Preconditions_Input": {
            "resourceVersion": [
                20
            ],
            "uid": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "com_miloapis_resourcemanager_v1alpha1_Organization_Input": {
            "apiVersion": [
                20
            ],
            "kind": [
                20
            ],
            "metadata": [
                53
            ],
            "spec": [
                59
            ],
            "status": [
                62
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_Input": {
            "contactInfo": [
                60
            ],
            "type": [
                51
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_Input": {
            "address": [
                61
            ],
            "businessName": [
                12
            ],
            "email": [
                13
            ],
            "name": [
                14
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_contactInfo_address_Input": {
            "city": [
                6
            ],
            "country": [
                7
            ],
            "line1": [
                8
            ],
            "line2": [
                9
            ],
            "postalCode": [
                10
            ],
            "region": [
                11
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_Input": {
            "conditions": [
                63
            ],
            "observedGeneration": [
                2
            ],
            "__typename": [
                20
            ]
        },
        "query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_Input": {
            "lastTransitionTime": [
                1
            ],
            "message": [
                15
            ],
            "observedGeneration": [
                2
            ],
            "reason": [
                16
            ],
            "status": [
                52
            ],
            "type": [
                17
            ],
            "__typename": [
                20
            ]
        },
        "ParsedUserAgent": {
            "browser": [
                20
            ],
            "os": [
                20
            ],
            "formatted": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "GeoLocation": {
            "city": [
                20
            ],
            "country": [
                20
            ],
            "countryCode": [
                20
            ],
            "formatted": [
                20
            ],
            "__typename": [
                20
            ]
        },
        "ExtendedSession": {
            "id": [
                20
            ],
            "userUID": [
                20
            ],
            "provider": [
                20
            ],
            "ipAddress": [
                20
            ],
            "fingerprintID": [
                20
            ],
            "createdAt": [
                20
            ],
            "lastUpdatedAt": [
                20
            ],
            "userAgent": [
                64
            ],
            "location": [
                65
            ],
            "__typename": [
                20
            ]
        }
    }
}