(function() {
    'use strict';

    angular
        .module('foodnetApp')
        .factory('CfmsSearch', CfmsSearch);

    CfmsSearch.$inject = ['$resource'];

    function CfmsSearch($resource) {
        var resourceUrl =  'api/_search/cfms/:id';

        return $resource(resourceUrl, {}, {
            'query': { method: 'GET', isArray: true}
        });
    }
})();
