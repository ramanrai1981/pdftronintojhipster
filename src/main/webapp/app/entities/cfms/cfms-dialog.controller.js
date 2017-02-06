(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .controller('CfmsDialogController', CfmsDialogController);

    CfmsDialogController.$inject = ['$timeout', '$scope', '$stateParams', '$uibModalInstance', 'entity', 'Cfms'];

    function CfmsDialogController ($timeout, $scope, $stateParams, $uibModalInstance, entity, Cfms) {
        var vm = this;

        vm.cfms = entity;
        vm.clear = clear;
        vm.save = save;

        $timeout(function (){
            angular.element('.form-group:eq(1)>input').focus();
        });

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function save () {
            vm.isSaving = true;
            if (vm.cfms.id !== null) {
                Cfms.update(vm.cfms, onSaveSuccess, onSaveError);
            } else {
                Cfms.save(vm.cfms, onSaveSuccess, onSaveError);
            }
        }

        function onSaveSuccess (result) {
            $scope.$emit('foodnetApp:cfmsUpdate', result);
            $uibModalInstance.close(result);
            vm.isSaving = false;
        }

        function onSaveError () {
            vm.isSaving = false;
        }


    }
})();
