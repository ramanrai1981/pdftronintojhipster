(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .config(stateConfig);

    stateConfig.$inject = ['$stateProvider'];

    function stateConfig($stateProvider) {
        $stateProvider
        .state('cfms', {
            parent: 'entity',
            url: '/cfms?page&sort&search',
            data: {
                authorities: ['ROLE_USER'],
                pageTitle: 'foodnetApp.cfms.home.title'
            },
            views: {
                'content@': {
                    templateUrl: 'app/entities/cfms/cfms.html',
                    controller: 'CfmsController',
                    controllerAs: 'vm'
                }
            },
            params: {
                page: {
                    value: '1',
                    squash: true
                },
                sort: {
                    value: 'id,asc',
                    squash: true
                },
                search: null
            },
            resolve: {
                pagingParams: ['$stateParams', 'PaginationUtil', function ($stateParams, PaginationUtil) {
                    return {
                        page: PaginationUtil.parsePage($stateParams.page),
                        sort: $stateParams.sort,
                        predicate: PaginationUtil.parsePredicate($stateParams.sort),
                        ascending: PaginationUtil.parseAscending($stateParams.sort),
                        search: $stateParams.search
                    };
                }],
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                    $translatePartialLoader.addPart('cfms');
                    $translatePartialLoader.addPart('global');
                    return $translate.refresh();
                }]
            }
        })
        .state('cfms-detail', {
            parent: 'entity',
            url: '/cfms/{id}',
            data: {
                authorities: ['ROLE_USER'],
                pageTitle: 'foodnetApp.cfms.detail.title'
            },
            views: {
                'content@': {
                    templateUrl: 'app/entities/cfms/cfms-detail.html',
                    controller: 'CfmsDetailController',
                    controllerAs: 'vm'
                }
            },
            resolve: {
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                    $translatePartialLoader.addPart('cfms');
                    return $translate.refresh();
                }],
                entity: ['$stateParams', 'Cfms', function($stateParams, Cfms) {
                    return Cfms.get({id : $stateParams.id}).$promise;
                }],
                previousState: ["$state", function ($state) {
                    var currentStateData = {
                        name: $state.current.name || 'cfms',
                        params: $state.params,
                        url: $state.href($state.current.name, $state.params)
                    };
                    return currentStateData;
                }]
            }
        })
        .state('cfms-detail.edit', {
            parent: 'cfms-detail',
            url: '/detail/edit',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/cfms/cfms-dialog.html',
                    controller: 'CfmsDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: ['Cfms', function(Cfms) {
                            return Cfms.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('^', {}, { reload: false });
                }, function() {
                    $state.go('^');
                });
            }]
        })
        .state('cfms.new', {
            parent: 'cfms',
            url: '/new',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/cfms/cfms-dialog.html',
                    controller: 'CfmsDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: function () {
                            return {
                                mobile: null,
                                name: null,
                                fileloghistory: null,
                                file: null,
                                locationcurrent: null,
                                locationtarget: null,
                                id: null
                            };
                        }
                    }
                }).result.then(function() {
                    $state.go('cfms', null, { reload: 'cfms' });
                }, function() {
                    $state.go('cfms');
                });
            }]
        })
        .state('cfms.edit', {
            parent: 'cfms',
            url: '/{id}/edit',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/cfms/cfms-dialog.html',
                    controller: 'CfmsDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: ['Cfms', function(Cfms) {
                            return Cfms.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('cfms', null, { reload: 'cfms' });
                }, function() {
                    $state.go('^');
                });
            }]
        })
        .state('cfms.delete', {
            parent: 'cfms',
            url: '/{id}/delete',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/cfms/cfms-delete-dialog.html',
                    controller: 'CfmsDeleteController',
                    controllerAs: 'vm',
                    size: 'md',
                    resolve: {
                        entity: ['Cfms', function(Cfms) {
                            return Cfms.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('cfms', null, { reload: 'cfms' });
                }, function() {
                    $state.go('^');
                });
            }]
        });
    }

})();
