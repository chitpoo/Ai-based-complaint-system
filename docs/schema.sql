
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(30) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `sla_hours` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKrtrg3au50o5e8jjsntsd3x2ec` (`category`),
  UNIQUE KEY `UKj6cwks7xecs5jov19ro8ge3qk` (`name`),
  CONSTRAINT `departments_chk_1` CHECK ((`category` in (_utf8mb4'ACADEMIC',_utf8mb4'HOSTEL',_utf8mb4'INFRASTRUCTURE',_utf8mb4'FINANCE',_utf8mb4'HARASSMENT',_utf8mb4'UNCLASSIFIED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grievances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_confidence` decimal(5,4) DEFAULT NULL,
  `category` varchar(30) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` text NOT NULL,
  `is_anonymous` bit(1) NOT NULL,
  `is_escalated` bit(1) NOT NULL,
  `escalated_at` datetime(6) DEFAULT NULL,
  `priority` varchar(10) NOT NULL,
  `resolved_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `tracking_id` varchar(20) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `department_id` bigint DEFAULT NULL,
  `officer_id` bigint DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK1qkt20b8aomvn9f8vuuou4myf` (`tracking_id`),
  KEY `FKlgnwqqtyrk9eu1tlh5e0s3x9h` (`department_id`),
  KEY `FKw85tifjltf59medwx99ek2ss` (`officer_id`),
  KEY `FKqyf4764frp8vn8aikahcd8k51` (`user_id`),
  CONSTRAINT `FKlgnwqqtyrk9eu1tlh5e0s3x9h` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `FKqyf4764frp8vn8aikahcd8k51` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKw85tifjltf59medwx99ek2ss` FOREIGN KEY (`officer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `grievances_chk_1` CHECK ((`category` in (_utf8mb4'ACADEMIC',_utf8mb4'HOSTEL',_utf8mb4'INFRASTRUCTURE',_utf8mb4'FINANCE',_utf8mb4'HARASSMENT',_utf8mb4'UNCLASSIFIED'))),
  CONSTRAINT `grievances_chk_2` CHECK ((`priority` in (_utf8mb4'LOW',_utf8mb4'MEDIUM',_utf8mb4'HIGH'))),
  CONSTRAINT `grievances_chk_3` CHECK ((`status` in (_utf8mb4'SUBMITTED',_utf8mb4'ASSIGNED',_utf8mb4'IN_PROGRESS',_utf8mb4'RESOLVED',_utf8mb4'CLOSED',_utf8mb4'ESCALATED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `new_status` varchar(20) NOT NULL,
  `old_status` varchar(20) DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  `changed_by` bigint DEFAULT NULL,
  `grievance_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKivukhmmfvoqyn9rt7mvtkfbgn` (`changed_by`),
  KEY `FKsk0je15ghti6x75xrpyvm2rsk` (`grievance_id`),
  CONSTRAINT `FKivukhmmfvoqyn9rt7mvtkfbgn` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKsk0je15ghti6x75xrpyvm2rsk` FOREIGN KEY (`grievance_id`) REFERENCES `grievances` (`id`),
  CONSTRAINT `status_history_chk_1` CHECK ((`new_status` in (_utf8mb4'SUBMITTED',_utf8mb4'ASSIGNED',_utf8mb4'IN_PROGRESS',_utf8mb4'RESOLVED',_utf8mb4'CLOSED',_utf8mb4'ESCALATED'))),
  CONSTRAINT `status_history_chk_2` CHECK ((`old_status` in (_utf8mb4'SUBMITTED',_utf8mb4'ASSIGNED',_utf8mb4'IN_PROGRESS',_utf8mb4'RESOLVED',_utf8mb4'CLOSED',_utf8mb4'ESCALATED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `email` varchar(150) NOT NULL,
  `name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `department_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`),
  KEY `FKsbg59w8q63i0oo53rlgvlcnjq` (`department_id`),
  CONSTRAINT `FKsbg59w8q63i0oo53rlgvlcnjq` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `users_chk_1` CHECK ((`role` in (_utf8mb4'USER',_utf8mb4'OFFICER',_utf8mb4'ADMIN')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

