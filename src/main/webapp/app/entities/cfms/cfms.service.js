(function() {
    'use strict';
    angular
        .module('foodnetApp')
        .factory('Cfms', Cfms);

    Cfms.$inject = ['$resource'];

    function Cfms ($resource) {
        var resourceUrl =  'api/cfms/:id';

        return $resource(resourceUrl, {}, {
            'query': { method: 'GET', isArray: true},
            'get': {
                method: 'GET',
                transformResponse: function (data) {
                    if (data) {
                        data = angular.fromJson(data);
                    }
                    return data;
                }
            },
            'update': { method:'PUT' }
        });
    }
})();
