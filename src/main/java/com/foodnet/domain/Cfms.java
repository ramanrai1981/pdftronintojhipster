package com.foodnet.domain;

import org.springframework.data.elasticsearch.annotations.Document;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Objects;

/**
 * A Cfms.
 */
@Entity
@Table(name = "cfms")
@Document(indexName = "cfms")
public class Cfms implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Column(name = "mobile")
    private String mobile;

    @Column(name = "name")
    private String name;

    @Column(name = "fileloghistory")
    private String fileloghistory;

    @Column(name = "file")
    private String file;

    @Column(name = "locationcurrent")
    private String locationcurrent;

    @Column(name = "locationtarget")
    private String locationtarget;

    @Column(name="company")
    private String company;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMobile() {
        return mobile;
    }

    public Cfms mobile(String mobile) {
        this.mobile = mobile;
        return this;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getName() {
        return name;
    }

    public Cfms name(String name) {
        this.name = name;
        return this;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFileloghistory() {
        return fileloghistory;
    }

    public Cfms fileloghistory(String fileloghistory) {
        this.fileloghistory = fileloghistory;
        return this;
    }

    public void setFileloghistory(String fileloghistory) {
        this.fileloghistory = fileloghistory;
    }

    public String getFile() {
        return file;
    }

    public Cfms file(String file) {
        this.file = file;
        return this;
    }

    public void setFile(String file) {
        this.file = file;
    }

    public String getLocationcurrent() {
        return locationcurrent;
    }

    public Cfms locationcurrent(String locationcurrent) {
        this.locationcurrent = locationcurrent;
        return this;
    }

    public void setLocationcurrent(String locationcurrent) {
        this.locationcurrent = locationcurrent;
    }

    public String getLocationtarget() {
        return locationtarget;
    }

    public Cfms locationtarget(String locationtarget) {
        this.locationtarget = locationtarget;
        return this;
    }

    public void setLocationtarget(String locationtarget) {
        this.locationtarget = locationtarget;
    }


    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public Cfms company(String company) {
        this.company = company;
        return this;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Cfms cfms = (Cfms) o;
        if (cfms.id == null || id == null) {
            return false;
        }
        return Objects.equals(id, cfms.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "Cfms{" +
            "id=" + id +
            ", mobile='" + mobile + "'" +
            ", name='" + name + "'" +
            ", fileloghistory='" + fileloghistory + "'" +
            ", file='" + file + "'" +
            ", locationcurrent='" + locationcurrent + "'" +
            ", locationtarget='" + locationtarget + "'" +
            ", company='" + company + "'" +
            '}';
    }
}
