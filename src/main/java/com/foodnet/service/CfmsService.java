package com.foodnet.service;

import com.foodnet.domain.Cfms;
import com.foodnet.repository.CfmsRepository;
import com.foodnet.repository.search.CfmsSearchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import javax.inject.Inject;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import static org.elasticsearch.index.query.QueryBuilders.*;

/**
 * Service Implementation for managing Cfms.
 */
@Service
@Transactional
public class CfmsService {

    private final Logger log = LoggerFactory.getLogger(CfmsService.class);
    
    @Inject
    private CfmsRepository cfmsRepository;

    @Inject
    private CfmsSearchRepository cfmsSearchRepository;

    /**
     * Save a cfms.
     *
     * @param cfms the entity to save
     * @return the persisted entity
     */
    public Cfms save(Cfms cfms) {
        log.debug("Request to save Cfms : {}", cfms);
        Cfms result = cfmsRepository.save(cfms);
        cfmsSearchRepository.save(result);
        return result;
    }

    /**
     *  Get all the cfms.
     *  
     *  @param pageable the pagination information
     *  @return the list of entities
     */
    @Transactional(readOnly = true) 
    public Page<Cfms> findAll(Pageable pageable) {
        log.debug("Request to get all Cfms");
        Page<Cfms> result = cfmsRepository.findAll(pageable);
        return result;
    }

    /**
     *  Get one cfms by id.
     *
     *  @param id the id of the entity
     *  @return the entity
     */
    @Transactional(readOnly = true) 
    public Cfms findOne(Long id) {
        log.debug("Request to get Cfms : {}", id);
        Cfms cfms = cfmsRepository.findOne(id);
        return cfms;
    }

    /**
     *  Delete the  cfms by id.
     *
     *  @param id the id of the entity
     */
    public void delete(Long id) {
        log.debug("Request to delete Cfms : {}", id);
        cfmsRepository.delete(id);
        cfmsSearchRepository.delete(id);
    }

    /**
     * Search for the cfms corresponding to the query.
     *
     *  @param query the query of the search
     *  @return the list of entities
     */
    @Transactional(readOnly = true)
    public Page<Cfms> search(String query, Pageable pageable) {
        log.debug("Request to search for a page of Cfms for query {}", query);
        Page<Cfms> result = cfmsSearchRepository.search(queryStringQuery(query), pageable);
        return result;
    }
}
