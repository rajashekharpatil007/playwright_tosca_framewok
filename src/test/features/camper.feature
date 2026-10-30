Feature: Create Camper insurance quotes
  As a user of the Vehicle Insurance Application
  I want to complete the camper quote workflow
  So that the available quote option can be selected

  Scenario Outline: <caseName> [<caseId>]
    Given I open the configured insurance application
    When I select the vehicle type for case "<caseId>"
    And I complete the Vehicle Data form for case "<caseId>"
    And I complete the Insurant Data form for case "<caseId>"
    And I complete the Product Data form for case "<caseId>"
    And I choose the price option for case "<caseId>"
    Then I return home after confirming the quote option for case "<caseId>"

    Examples:
      | caseId | caseName |
      | camper-straightthrough | StraightThrough |
      | camper-engine-performance-between-1000-and-2000 | Engine performance between 1000 and 2000 |
      | camper-manufactured-more-than-5-years-in-the-past | Manufactured more than 5 Years in the Past |
      | camper-right-hand-drive-yes | Right Hand Drive: Yes |
      | camper-payload-between-1k-and-4k | Payload between 1k and 4k |
      | camper-payload-between-10k-and-25k | Payload between 10k and 25k |
      | camper-total-weight-between-3-5k-and-7k | Total Weight between 3.5k and 7k |
      | camper-total-weight-between-18k-and-45k | Total Weight between 18k and 45k |
      | camper-list-price-between-100k-and-300k | List price between 100K and 300K |
      | camper-age-between-18-an-25 | Age between 18 an 25 |
      | camper-age-between-56-and-70 | Age between 56 and 70 |
      | camper-female | Female |
      | camper-start-date-month-after-next-month | Start date month after next month |
      | camper-insuarance-sum-between-15m-and-35m | Insuarance sum between 15M and 35M |
      | camper-damage-insurance-no-coverage | Damage Insurance No Coverage |
      | camper-damage-insurance-full-coverage | Damage Insurance Full Coverage |
      | camper-euro-protection-true | Euro Protection: True |
      | camper-optional-products-3 | Optional Products_3 |
