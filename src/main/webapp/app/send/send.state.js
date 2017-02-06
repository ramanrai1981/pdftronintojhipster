(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .config(stateConfig);

    stateConfig.$inject = ['$stateProvider'];

    function stateConfig($stateProvider) {
        $stateProvider.state('send', {
            parent: 'app',
            url: '/send',
            data: {
                authorities: []
            },
            views: {
                'content@': {
                    templateUrl: 'app/send/send.html',
                    controller: 'SendController',
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
