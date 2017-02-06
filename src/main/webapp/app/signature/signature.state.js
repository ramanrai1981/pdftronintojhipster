(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .config(stateConfig);

    stateConfig.$inject = ['$stateProvider'];

    function stateConfig($stateProvider) {
        $stateProvider.state('signature', {
            parent: 'app',
            url: '/signature',
            data: {
                authorities: []
            },
            views: {
                'content@': {
                    templateUrl: 'app/signature/signature.html',
                    controller: 'SignatureController',
                    controllerAs: 'vm'
                }
            },
            resolve: {
                mainTranslatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate,$translatePartialLoader) {
                    $translatePartialLoader.addPart('home');
                    return $translate.refresh();
                }]
            }
        });
    }
})();
