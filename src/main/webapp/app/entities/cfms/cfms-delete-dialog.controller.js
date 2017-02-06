(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .controller('CfmsDeleteController',CfmsDeleteController);

    CfmsDeleteController.$inject = ['$uibModalInstance', 'entity', 'Cfms'];

    function CfmsDeleteController($uibModalInstance, entity, Cfms) {
        var vm = this;

        vm.cfms = entity;
        vm.clear = clear;
        vm.confirmDelete = confirmDelete;

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function confirmDelete (id) {
            Cfms.delete({id: id},
                function () {
                    $uibModalInstance.close(true);
                });
        }
    }
})();
