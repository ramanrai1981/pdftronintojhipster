package com.foodnet.repository.search;

import com.foodnet.domain.Cfms;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

/**
 * Spring Data ElasticSearch repository for the Cfms entity.
 */
public interface CfmsSearchRepository extends ElasticsearchRepository<Cfms, Long> {
}
