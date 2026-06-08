package com.musicapp.catalog.repository;

import com.musicapp.catalog.domain.AudioAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AudioAssetRepository extends JpaRepository<AudioAsset, UUID> {

    List<AudioAsset> findByTrackId(UUID trackId);
}
