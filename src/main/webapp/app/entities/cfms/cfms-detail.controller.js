(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .controller('CfmsDetailController', CfmsDetailController);

    CfmsDetailController.$inject = ['$scope', '$rootScope', '$stateParams', 'previousState', 'entity', 'Cfms'];

    function CfmsDetailController($scope, $rootScope, $stateParams, previousState, entity, Cfms) {
        var vm = this;

        vm.cfms = entity;
        vm.previousState = previousState.name;

        var unsubscribe = $rootScope.$on('foodnetApp:cfmsUpdate', function(event, result) {
            vm.cfms = result;
        });
        $scope.$on('$destroy', unsubscribe);
    }
})();
