package com.foodnet.web.rest;

import com.foodnet.FoodnetApp;

import com.foodnet.domain.Cfms;
import com.foodnet.repository.CfmsRepository;
import com.foodnet.service.CfmsService;
import com.foodnet.repository.search.CfmsSearchRepository;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;

import javax.inject.Inject;
import javax.persistence.EntityManager;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for the CfmsResource REST controller.
 *
 * @see CfmsResource
 */
@RunWith(SpringRunner.class)
@SpringBootTest(classes = FoodnetApp.class)
public class CfmsResourceIntTest {

    private static final String DEFAULT_MOBILE = "AAAAAAAAAA";
    private static final String UPDATED_MOBILE = "BBBBBBBBBB";

    private static final String DEFAULT_NAME = "AAAAAAAAAA";
    private static final String UPDATED_NAME = "BBBBBBBBBB";

    private static final String DEFAULT_FILELOGHISTORY = "AAAAAAAAAA";
    private static final String UPDATED_FILELOGHISTORY = "BBBBBBBBBB";

    private static final String DEFAULT_FILE = "AAAAAAAAAA";
    private static final String UPDATED_FILE = "BBBBBBBBBB";

    private static final String DEFAULT_LOCATIONCURRENT = "AAAAAAAAAA";
    private static final String UPDATED_LOCATIONCURRENT = "BBBBBBBBBB";

    private static final String DEFAULT_LOCATIONTARGET = "AAAAAAAAAA";
    private static final String UPDATED_LOCATIONTARGET = "BBBBBBBBBB";

    @Inject
    private CfmsRepository cfmsRepository;

    @Inject
    private CfmsService cfmsService;

    @Inject
    private CfmsSearchRepository cfmsSearchRepository;

    @Inject
    private MappingJackson2HttpMessageConverter jacksonMessageConverter;

    @Inject
    private PageableHandlerMethodArgumentResolver pageableArgumentResolver;

    @Inject
    private EntityManager em;

    private MockMvc restCfmsMockMvc;

    private Cfms cfms;

    @Before
    public void setup() {
        MockitoAnnotations.initMocks(this);
        CfmsResource cfmsResource = new CfmsResource();
        ReflectionTestUtils.setField(cfmsResource, "cfmsService", cfmsService);
        this.restCfmsMockMvc = MockMvcBuilders.standaloneSetup(cfmsResource)
            .setCustomArgumentResolvers(pageableArgumentResolver)
            .setMessageConverters(jacksonMessageConverter).build();
    }

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Cfms createEntity(EntityManager em) {
        Cfms cfms = new Cfms()
                .mobile(DEFAULT_MOBILE)
                .name(DEFAULT_NAME)
                .fileloghistory(DEFAULT_FILELOGHISTORY)
                .file(DEFAULT_FILE)
                .locationcurrent(DEFAULT_LOCATIONCURRENT)
                .locationtarget(DEFAULT_LOCATIONTARGET);
        return cfms;
    }

    @Before
    public void initTest() {
        cfmsSearchRepository.deleteAll();
        cfms = createEntity(em);
    }

    @Test
    @Transactional
    public void createCfms() throws Exception {
        int databaseSizeBeforeCreate = cfmsRepository.findAll().size();

        // Create the Cfms

        restCfmsMockMvc.perform(post("/api/cfms")
            .contentType(TestUtil.APPLICATION_JSON_UTF8)
            .content(TestUtil.convertObjectToJsonBytes(cfms)))
            .andExpect(status().isCreated());

        // Validate the Cfms in the database
        List<Cfms> cfmsList = cfmsRepository.findAll();
        assertThat(cfmsList).hasSize(databaseSizeBeforeCreate + 1);
        Cfms testCfms = cfmsList.get(cfmsList.size() - 1);
        assertThat(testCfms.getMobile()).isEqualTo(DEFAULT_MOBILE);
        assertThat(testCfms.getName()).isEqualTo(DEFAULT_NAME);
        assertThat(testCfms.getFileloghistory()).isEqualTo(DEFAULT_FILELOGHISTORY);
        assertThat(testCfms.getFile()).isEqualTo(DEFAULT_FILE);
        assertThat(testCfms.getLocationcurrent()).isEqualTo(DEFAULT_LOCATIONCURRENT);
        assertThat(testCfms.getLocationtarget()).isEqualTo(DEFAULT_LOCATIONTARGET);

        // Validate the Cfms in ElasticSearch
        Cfms cfmsEs = cfmsSearchRepository.findOne(testCfms.getId());
        assertThat(cfmsEs).isEqualToComparingFieldByField(testCfms);
    }

    @Test
    @Transactional
    public void createCfmsWithExistingId() throws Exception {
        int databaseSizeBeforeCreate = cfmsRepository.findAll().size();

        // Create the Cfms with an existing ID
        Cfms existingCfms = new Cfms();
        existingCfms.setId(1L);

        // An entity with an existing ID cannot be created, so this API call must fail
        restCfmsMockMvc.perform(post("/api/cfms")
            .contentType(TestUtil.APPLICATION_JSON_UTF8)
            .content(TestUtil.convertObjectToJsonBytes(existingCfms)))
            .andExpect(status().isBadRequest());

        // Validate the Alice in the database
        List<Cfms> cfmsList = cfmsRepository.findAll();
        assertThat(cfmsList).hasSize(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    public void getAllCfms() throws Exception {
        // Initialize the database
        cfmsRepository.saveAndFlush(cfms);

        // Get all the cfmsList
        restCfmsMockMvc.perform(get("/api/cfms?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_UTF8_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(cfms.getId().intValue())))
            .andExpect(jsonPath("$.[*].mobile").value(hasItem(DEFAULT_MOBILE.toString())))
            .andExpect(jsonPath("$.[*].name").value(hasItem(DEFAULT_NAME.toString())))
            .andExpect(jsonPath("$.[*].fileloghistory").value(hasItem(DEFAULT_FILELOGHISTORY.toString())))
            .andExpect(jsonPath("$.[*].file").value(hasItem(DEFAULT_FILE.toString())))
            .andExpect(jsonPath("$.[*].locationcurrent").value(hasItem(DEFAULT_LOCATIONCURRENT.toString())))
            .andExpect(jsonPath("$.[*].locationtarget").value(hasItem(DEFAULT_LOCATIONTARGET.toString())));
    }

    @Test
    @Transactional
    public void getCfms() throws Exception {
        // Initialize the database
        cfmsRepository.saveAndFlush(cfms);

        // Get the cfms
        restCfmsMockMvc.perform(get("/api/cfms/{id}", cfms.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_UTF8_VALUE))
            .andExpect(jsonPath("$.id").value(cfms.getId().intValue()))
            .andExpect(jsonPath("$.mobile").value(DEFAULT_MOBILE.toString()))
            .andExpect(jsonPath("$.name").value(DEFAULT_NAME.toString()))
            .andExpect(jsonPath("$.fileloghistory").value(DEFAULT_FILELOGHISTORY.toString()))
            .andExpect(jsonPath("$.file").value(DEFAULT_FILE.toString()))
            .andExpect(jsonPath("$.locationcurrent").value(DEFAULT_LOCATIONCURRENT.toString()))
            .andExpect(jsonPath("$.locationtarget").value(DEFAULT_LOCATIONTARGET.toString()));
    }

    @Test
    @Transactional
    public void getNonExistingCfms() throws Exception {
        // Get the cfms
        restCfmsMockMvc.perform(get("/api/cfms/{id}", Long.MAX_VALUE))
            .andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    public void updateCfms() throws Exception {
        // Initialize the database
        cfmsService.save(cfms);

        int databaseSizeBeforeUpdate = cfmsRepository.findAll().size();

        // Update the cfms
        Cfms updatedCfms = cfmsRepository.findOne(cfms.getId());
        updatedCfms
                .mobile(UPDATED_MOBILE)
                .name(UPDATED_NAME)
                .fileloghistory(UPDATED_FILELOGHISTORY)
                .file(UPDATED_FILE)
                .locationcurrent(UPDATED_LOCATIONCURRENT)
                .locationtarget(UPDATED_LOCATIONTARGET);

        restCfmsMockMvc.perform(put("/api/cfms")
            .contentType(TestUtil.APPLICATION_JSON_UTF8)
            .content(TestUtil.convertObjectToJsonBytes(updatedCfms)))
            .andExpect(status().isOk());

        // Validate the Cfms in the database
        List<Cfms> cfmsList = cfmsRepository.findAll();
        assertThat(cfmsList).hasSize(databaseSizeBeforeUpdate);
        Cfms testCfms = cfmsList.get(cfmsList.size() - 1);
        assertThat(testCfms.getMobile()).isEqualTo(UPDATED_MOBILE);
        assertThat(testCfms.getName()).isEqualTo(UPDATED_NAME);
        assertThat(testCfms.getFileloghistory()).isEqualTo(UPDATED_FILELOGHISTORY);
        assertThat(testCfms.getFile()).isEqualTo(UPDATED_FILE);
        assertThat(testCfms.getLocationcurrent()).isEqualTo(UPDATED_LOCATIONCURRENT);
        assertThat(testCfms.getLocationtarget()).isEqualTo(UPDATED_LOCATIONTARGET);

        // Validate the Cfms in ElasticSearch
        Cfms cfmsEs = cfmsSearchRepository.findOne(testCfms.getId());
        assertThat(cfmsEs).isEqualToComparingFieldByField(testCfms);
    }

    @Test
    @Transactional
    public void updateNonExistingCfms() throws Exception {
        int databaseSizeBeforeUpdate = cfmsRepository.findAll().size();

        // Create the Cfms

        // If the entity doesn't have an ID, it will be created instead of just being updated
        restCfmsMockMvc.perform(put("/api/cfms")
            .contentType(TestUtil.APPLICATION_JSON_UTF8)
            .content(TestUtil.convertObjectToJsonBytes(cfms)))
            .andExpect(status().isCreated());

        // Validate the Cfms in the database
        List<Cfms> cfmsList = cfmsRepository.findAll();
        assertThat(cfmsList).hasSize(databaseSizeBeforeUpdate + 1);
    }

    @Test
    @Transactional
    public void deleteCfms() throws Exception {
        // Initialize the database
        cfmsService.save(cfms);

        int databaseSizeBeforeDelete = cfmsRepository.findAll().size();

        // Get the cfms
        restCfmsMockMvc.perform(delete("/api/cfms/{id}", cfms.getId())
            .accept(TestUtil.APPLICATION_JSON_UTF8))
            .andExpect(status().isOk());

        // Validate ElasticSearch is empty
        boolean cfmsExistsInEs = cfmsSearchRepository.exists(cfms.getId());
        assertThat(cfmsExistsInEs).isFalse();

        // Validate the database is empty
        List<Cfms> cfmsList = cfmsRepository.findAll();
        assertThat(cfmsList).hasSize(databaseSizeBeforeDelete - 1);
    }

    @Test
    @Transactional
    public void searchCfms() throws Exception {
        // Initialize the database
        cfmsService.save(cfms);

        // Search the cfms
        restCfmsMockMvc.perform(get("/api/_search/cfms?query=id:" + cfms.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_UTF8_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(cfms.getId().intValue())))
            .andExpect(jsonPath("$.[*].mobile").value(hasItem(DEFAULT_MOBILE.toString())))
            .andExpect(jsonPath("$.[*].name").value(hasItem(DEFAULT_NAME.toString())))
            .andExpect(jsonPath("$.[*].fileloghistory").value(hasItem(DEFAULT_FILELOGHISTORY.toString())))
            .andExpect(jsonPath("$.[*].file").value(hasItem(DEFAULT_FILE.toString())))
            .andExpect(jsonPath("$.[*].locationcurrent").value(hasItem(DEFAULT_LOCATIONCURRENT.toString())))
            .andExpect(jsonPath("$.[*].locationtarget").value(hasItem(DEFAULT_LOCATIONTARGET.toString())));
    }
}
