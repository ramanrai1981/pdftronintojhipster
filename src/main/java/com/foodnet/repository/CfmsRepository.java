package com.foodnet.repository;

import com.foodnet.domain.Cfms;

import org.springframework.data.jpa.repository.*;

import java.util.List;

/**
 * Spring Data JPA repository for the Cfms entity.
 */
@SuppressWarnings("unused")
public interface CfmsRepository extends JpaRepository<Cfms,Long> {

}
