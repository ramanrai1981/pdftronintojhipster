package com.foodnet.web.rest;

import com.codahale.metrics.annotation.Timed;
import com.foodnet.domain.Cfms;
import com.foodnet.service.CfmsService;
import com.foodnet.web.rest.util.HeaderUtil;
import com.foodnet.web.rest.util.PaginationUtil;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.inject.Inject;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Optional;

/**
 * REST controller for managing Cfms.
 */
@RestController
@RequestMapping("/api")
public class CfmsResource {

    private final Logger log = LoggerFactory.getLogger(CfmsResource.class);

    @Inject
    private CfmsService cfmsService;

    /**
     * POST  /cfms : Create a new cfms.
     *
     * @param cfms the cfms to create
     * @return the ResponseEntity with status 201 (Created) and with body the new cfms, or with status 400 (Bad Request) if the cfms has already an ID
     * @throws URISyntaxException if the Location URI syntax is incorrect
     */
    @PostMapping("/cfms")
    @Timed
    public ResponseEntity<Cfms> createCfms(@RequestBody Cfms cfms) throws URISyntaxException {
        log.debug("REST request to save Cfms : {}", cfms);
        if (cfms.getId() != null) {
            return ResponseEntity.badRequest().headers(HeaderUtil.createFailureAlert("cfms", "idexists", "A new cfms cannot already have an ID")).body(null);
        }
        Cfms result = cfmsService.save(cfms);
        return ResponseEntity.created(new URI("/api/cfms/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert("cfms", result.getId().toString()))
            .body(result);
    }

    /**
     * PUT  /cfms : Updates an existing cfms.
     *
     * @param cfms the cfms to update
     * @return the ResponseEntity with status 200 (OK) and with body the updated cfms,
     * or with status 400 (Bad Request) if the cfms is not valid,
     * or with status 500 (Internal Server Error) if the cfms couldnt be updated
     * @throws URISyntaxException if the Location URI syntax is incorrect
     */
    @PutMapping("/cfms")
    @Timed
    public ResponseEntity<Cfms> updateCfms(@RequestBody Cfms cfms) throws URISyntaxException {
        log.debug("REST request to update Cfms : {}", cfms);
        if (cfms.getId() == null) {
            return createCfms(cfms);
        }
        Cfms result = cfmsService.save(cfms);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert("cfms", cfms.getId().toString()))
            .body(result);
    }

    /**
     * GET  /cfms : get all the cfms.
     *
     * @param pageable the pagination information
     * @return the ResponseEntity with status 200 (OK) and the list of cfms in body
     * @throws URISyntaxException if there is an error to generate the pagination HTTP headers
     */
    @GetMapping("/cfms")
    @Timed
    public ResponseEntity<List<Cfms>> getAllCfms(@ApiParam Pageable pageable)
        throws URISyntaxException {
        log.debug("REST request to get a page of Cfms");
        Page<Cfms> page = cfmsService.findAll(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/cfms");
        return new ResponseEntity<>(page.getContent(), headers, HttpStatus.OK);
    }

    /**
     * GET  /cfms/:id : get the "id" cfms.
     *
     * @param id the id of the cfms to retrieve
     * @return the ResponseEntity with status 200 (OK) and with body the cfms, or with status 404 (Not Found)
     */
    @GetMapping("/cfms/{id}")
    @Timed
    public ResponseEntity<Cfms> getCfms(@PathVariable Long id) {
        log.debug("REST request to get Cfms : {}", id);
        Cfms cfms = cfmsService.findOne(id);
        return Optional.ofNullable(cfms)
            .map(result -> new ResponseEntity<>(
                result,
                HttpStatus.OK))
            .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * DELETE  /cfms/:id : delete the "id" cfms.
     *
     * @param id the id of the cfms to delete
     * @return the ResponseEntity with status 200 (OK)
     */
    @DeleteMapping("/cfms/{id}")
    @Timed
    public ResponseEntity<Void> deleteCfms(@PathVariable Long id) {
        log.debug("REST request to delete Cfms : {}", id);
        cfmsService.delete(id);
        return ResponseEntity.ok().headers(HeaderUtil.createEntityDeletionAlert("cfms", id.toString())).build();
    }

    /**
     * SEARCH  /_search/cfms?query=:query : search for the cfms corresponding
     * to the query.
     *
     * @param query the query of the cfms search
     * @param pageable the pagination information
     * @return the result of the search
     * @throws URISyntaxException if there is an error to generate the pagination HTTP headers
     */
    @GetMapping("/_search/cfms")
    @Timed
    public ResponseEntity<List<Cfms>> searchCfms(@RequestParam String query, @ApiParam Pageable pageable)
        throws URISyntaxException {
        log.debug("REST request to search for a page of Cfms for query {}", query);
        Page<Cfms> page = cfmsService.search(query, pageable);
        HttpHeaders headers = PaginationUtil.generateSearchPaginationHttpHeaders(query, page, "/api/_search/cfms");
        return new ResponseEntity<>(page.getContent(), headers, HttpStatus.OK);
    }


}
